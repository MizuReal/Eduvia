import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ListChecks,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trophy,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { ConfirmDialog } from '../components/content/ConfirmDialog'
import { FormAlert } from '../components/auth/FormAlert'
import { QuizPaperPreview } from '../components/quiz/QuizPaperPreview'
import { TopicProgressBar } from '../components/student/ProgressBars'
import { StudentAccessGate } from '../components/student/StudentAccessGate'
import { Button } from '../components/ui/Button'
import { CORRECT_OPTIONS } from '../config/quiz'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import {
  saveAttemptAnswers,
  startQuizAttempt,
  submitAttempt,
} from '../services/learningService'
import { getStudentTopicContent } from '../services/studentContentService'
import type { AuthMode } from '../types/auth'
import type { CorrectOption } from '../types/quiz'
import type { StudentAttemptWorkspace } from '../types/learning'

type StudentQuizPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function QuizSkeleton() {
  return (
    <div className="mt-xl" aria-busy="true">
      <div className="h-24 max-w-2xl animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="mt-md h-96 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading quiz</span>
    </div>
  )
}

function QuizError({
  message,
  onRetry,
  backHref,
}: {
  message: string
  onRetry?: () => void
  backHref: string
}) {
  return (
    <div
      role="alert"
      className="mt-xl max-w-card rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
    >
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <p className="mt-xs text-body-sm text-ink">{message}</p>
      <div className="mt-sm flex flex-wrap gap-xs">
        {onRetry && (
          <Button variant="utility" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        )}
        <Link
          to={backHref}
          className="inline-flex min-h-11 items-center gap-xxs rounded-md border border-hairline bg-surface px-md text-body-sm text-ink hover:bg-canvas-soft"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to topic
        </Link>
      </div>
    </div>
  )
}

function AnswerOptions({
  questionId,
  value,
  options,
  onChange,
}: {
  questionId: string
  value: CorrectOption | undefined
  options?: Partial<Record<CorrectOption, string | null>>
  onChange: (option: CorrectOption) => void
}) {
  return (
    <div className="mt-sm grid gap-xs sm:grid-cols-2">
      {CORRECT_OPTIONS.map((option) => {
        const optionText = options?.[option]

        return (
          <label
            key={option}
            className="flex min-h-11 cursor-pointer items-center gap-xs rounded-md border border-hairline px-sm py-xxs text-body-sm text-ink hover:bg-canvas-soft"
          >
            <input
              type="radio"
              name={`question-${questionId}`}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="size-4 accent-primary"
            />
            <span className="font-medium">{option}.</span>
            {optionText ? <span>{optionText}</span> : null}
          </label>
        )
      })}
    </div>
  )
}

function QuizQuestionCard({
  index,
  attempt,
  value,
  onChange,
}: {
  index: number
  attempt: StudentAttemptWorkspace
  value: CorrectOption | undefined
  onChange: (option: CorrectOption) => void
}) {
  const question = attempt.questions[index]

  if (!question) {
    return null
  }

  return (
    <li className="rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <fieldset>
        <legend className="text-body-md font-medium text-ink">
          {index + 1}. {question.prompt}
        </legend>
        <AnswerOptions
          questionId={question.id}
          value={value}
          options={{
            A: question.optionA,
            B: question.optionB,
            C: question.optionC,
            D: question.optionD,
          }}
          onChange={onChange}
        />
      </fieldset>
    </li>
  )
}

function ResultCard({
  attempt,
  onRetry,
  backHref,
}: {
  attempt: StudentAttemptWorkspace
  onRetry: () => void
  backHref: string
}) {
  const result = attempt.result

  if (!result) {
    return null
  }

  return (
    <section aria-labelledby="quiz-result-heading" className="mt-xl space-y-md">
      <div className="rounded-lg border border-hairline bg-surface p-lg text-center shadow-soft">
        {result.passed ? (
          <Trophy
            className="mx-auto size-12 text-accent-green"
            aria-hidden="true"
          />
        ) : (
          <CircleAlert
            className="mx-auto size-12 text-accent-orange-deep"
            aria-hidden="true"
          />
        )}
        <h1 id="quiz-result-heading" className="mt-sm text-heading-2">
          {result.passed ? 'Congratulations!' : 'Not passed yet'}
        </h1>
        <p className="mt-xxs text-body-sm text-ink-muted">
          {result.passed
            ? 'You passed the quiz and unlocked the next topic.'
            : 'Review the slides and summary, then try again. Correct answers stay hidden until you pass.'}
        </p>
        <p className="mt-md text-heading-1 text-ink">{result.percentage}%</p>
        <p className="mt-xxs text-body-sm text-ink-muted">
          {result.score} of {result.maxScore} points · passing score{' '}
          {attempt.quiz.passingScore}%
        </p>
        <div className="mt-md flex flex-wrap justify-center gap-xs">
          <Link
            to={backHref}
            className="inline-flex min-h-11 items-center gap-xxs rounded-full bg-primary px-lg py-sm text-button text-on-primary transition-colors hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Back to topic
          </Link>
          {!result.passed && (
            <Button variant="utility" onClick={onRetry}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          )}
        </div>
      </div>

      {result.passed && (
        <div className="rounded-lg border border-hairline bg-surface p-md">
          <h2 className="text-title text-ink">Answer review</h2>
          <ol className="mt-sm space-y-xs">
            {result.answers.map((answer, index) => (
              <li
                key={answer.questionId}
                className="flex flex-wrap items-center justify-between gap-xs border-b border-hairline pb-xs last:border-0 last:pb-0"
              >
                <span className="text-body-sm text-ink">
                  Question {index + 1}: selected {answer.selectedOption}
                </span>
                <span
                  className={
                    answer.isCorrect
                      ? 'inline-flex items-center gap-xxs text-body-sm text-ink'
                      : 'inline-flex items-center gap-xxs text-body-sm text-accent-orange-deep'
                  }
                >
                  {answer.isCorrect ? (
                    <CheckCircle2
                      className="size-4 text-accent-green"
                      aria-hidden="true"
                    />
                  ) : (
                    <CircleAlert
                      className="size-4 text-accent-orange-deep"
                      aria-hidden="true"
                    />
                  )}
                  {answer.isCorrect
                    ? 'Correct'
                    : answer.correctOption
                      ? `Correct answer: ${answer.correctOption}`
                      : 'Incorrect'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

export function StudentQuizPage({ onOpenAuth }: StudentQuizPageProps) {
  const { courseId, topicId } = useParams<{
    courseId: string
    topicId: string
  }>()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [attempt, setAttempt] = useState<StudentAttemptWorkspace | null>(null)
  const [answers, setAnswers] = useState<Record<string, CorrectOption>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isAlreadyPassed, setIsAlreadyPassed] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const attemptId = attempt?.id ?? null
  const backHref = `/student/subjects/${courseId}/topics/${topicId}`

  const answersPayload = useMemo(
    () =>
      Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      })),
    [answers],
  )

  const load = useCallback(async () => {
    if (!courseId || !topicId || !accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    setIsAlreadyPassed(false)
    setSaveError(null)

    try {
      const topic = await getStudentTopicContent(topicId, accessToken)

      if (!topic.quiz) {
        setLoadError('This topic does not have a published quiz.')
        return
      }

      const started = await startQuizAttempt(topic.quiz.id, accessToken)
      setAttempt(started)
      setAnswers(
        Object.fromEntries(
          started.answers.map((answer) => [
            answer.questionId,
            answer.selectedOption,
          ]),
        ),
      )
      setSaveState('idle')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'QUIZ_ALREADY_PASSED') {
        setIsAlreadyPassed(true)
        setLoadError('You already passed this quiz.')
        return
      }

      if (error instanceof ApiError && error.code === 'SLIDES_NOT_COMPLETE') {
        setLoadError('Finish the topic slides before taking the quiz.')
        return
      }

      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'We could not load this quiz. Try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, courseId, topicId])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  useEffect(() => {
    if (
      !attemptId ||
      !accessToken ||
      attempt?.status !== 'in_progress' ||
      answersPayload.length === 0
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      setSaveState('saving')
      setSaveError(null)

      void saveAttemptAnswers(attemptId, answersPayload, accessToken)
        .then(() => setSaveState('saved'))
        .catch(() => {
          setSaveState('error')
          setSaveError('We could not save your answers. Try again.')
        })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [accessToken, answersPayload, attemptId, attempt?.status])

  const selectAnswer = (questionId: string, option: CorrectOption) => {
    setAnswers((current) => ({ ...current, [questionId]: option }))
    setSaveState('idle')
  }

  const submit = async () => {
    if (!attemptId || !accessToken || !attempt) {
      return
    }

    setIsConfirmOpen(false)
    setIsSubmitting(true)
    setSaveError(null)

    try {
      await saveAttemptAnswers(attemptId, answersPayload, accessToken)
      const graded = await submitAttempt(attemptId, accessToken)
      setAttempt(graded)
      setAnswers(
        Object.fromEntries(
          graded.answers.map((answer) => [
            answer.questionId,
            answer.selectedOption,
          ]),
        ),
      )
      setSaveState('saved')
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : 'We could not submit this quiz. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const retry = async () => {
    if (!attempt?.quizId || !accessToken) {
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      const started = await startQuizAttempt(attempt.quizId, accessToken)
      setAttempt(started)
      setAnswers(
        Object.fromEntries(
          started.answers.map((answer) => [
            answer.questionId,
            answer.selectedOption,
          ]),
        ),
      )
      setSaveState('idle')
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'We could not start another attempt. Try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const answeredCount = answersPayload.length
  const allAnswered =
    attempt !== null && answeredCount === attempt.questions.length
  const isGraded = attempt?.status === 'graded'

  return (
    <section className="py-xl lg:py-section">
      <Container>
        <Link
          to={backHref}
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to topic
        </Link>

        <StudentAccessGate onOpenAuth={onOpenAuth}>
          {isLoading && <QuizSkeleton />}
          {!isLoading && loadError && (
            <QuizError
              message={loadError}
              backHref={backHref}
              onRetry={
                isAlreadyPassed
                  ? undefined
                  : () => setReloadKey((key) => key + 1)
              }
            />
          )}
          {!isLoading && !loadError && attempt && isGraded && (
            <ResultCard
              attempt={attempt}
              backHref={backHref}
              onRetry={() => void retry()}
            />
          )}
          {!isLoading && !loadError && attempt && !isGraded && (
            <>
              <div className="mt-md max-w-3xl">
                <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
                  Quiz · attempt {attempt.attemptNumber}
                </span>
                <h1 className="mt-md text-heading-2 sm:text-heading-1">
                  {attempt.quiz.title}
                </h1>
                {attempt.quiz.instructions && (
                  <p className="mt-sm whitespace-pre-line text-body-sm text-ink-muted">
                    {attempt.quiz.instructions}
                  </p>
                )}
                <p className="mt-xs text-caption text-ink-muted">
                  {attempt.questions.length} questions · passing score{' '}
                  {attempt.quiz.passingScore}%
                </p>
              </div>

              <div className="mt-md">
                <TopicProgressBar
                  value={answeredCount}
                  total={attempt.questions.length}
                  label="Answered questions"
                />
              </div>

              <div className="mt-sm min-h-6" aria-live="polite">
                {saveState === 'saving' && (
                  <span className="inline-flex items-center gap-xxs text-caption text-ink-muted">
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    Saving answers…
                  </span>
                )}
                {saveState === 'saved' && (
                  <span className="inline-flex items-center gap-xxs text-caption text-ink-muted">
                    <CheckCircle2
                      className="size-3.5 text-accent-green"
                      aria-hidden="true"
                    />
                    Answers saved
                  </span>
                )}
                {saveState === 'error' && (
                  <span className="text-caption text-accent-orange-deep">
                    Answers not saved
                  </span>
                )}
              </div>

              <div className="mt-sm">
                <FormAlert message={saveError} />
              </div>

              {attempt.quiz.mode === 'document' ? (
                <div className="mt-md grid gap-md lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    {attempt.paper ? (
                      <QuizPaperPreview
                        file={attempt.paper}
                        accessToken={accessToken ?? ''}
                        signedUrl={attempt.paper.url}
                        className="h-[65vh] w-full rounded-lg border border-hairline bg-surface"
                      />
                    ) : (
                      <p className="rounded-lg border border-accent-orange-deep/30 bg-surface p-md text-body-sm text-ink">
                        The quiz paper is not available.
                      </p>
                    )}
                  </div>
                  <ol className="min-w-0 space-y-xs rounded-lg border border-hairline bg-surface p-md">
                    {attempt.questions.map((question, index) => (
                      <li
                        key={question.id}
                        className="flex flex-wrap items-center justify-between gap-sm border-b border-hairline py-xs last:border-0"
                      >
                        <span className="text-body-sm font-medium text-ink">
                          Question {index + 1}
                        </span>
                        <AnswerOptions
                          questionId={question.id}
                          value={answers[question.id]}
                          onChange={(option) =>
                            selectAnswer(question.id, option)
                          }
                        />
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <ol className="mt-md space-y-md">
                  {attempt.questions.map((question, index) => (
                    <QuizQuestionCard
                      key={question.id}
                      index={index}
                      attempt={attempt}
                      value={answers[question.id]}
                      onChange={(option) =>
                        selectAnswer(question.id, option)
                      }
                    />
                  ))}
                </ol>
              )}

              <div className="mt-md flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={!allAnswered || isSubmitting}
                >
                  <ListChecks className="size-4" aria-hidden="true" />
                  {isSubmitting ? 'Submitting…' : 'Submit quiz'}
                </Button>
              </div>
            </>
          )}
        </StudentAccessGate>

        {isConfirmOpen && attempt && (
          <ConfirmDialog
            title="Submit quiz?"
            description={`You answered all ${attempt.questions.length} questions. You cannot change your answers after submitting.`}
            confirmLabel="Submit quiz"
            onConfirm={() => void submit()}
            onClose={() => setIsConfirmOpen(false)}
          />
        )}
      </Container>
    </section>
  )
}
