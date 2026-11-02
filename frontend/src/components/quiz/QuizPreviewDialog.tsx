import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { previewGrade } from '../../services/quizService'
import { ApiError } from '../../services/apiClient'
import type {
  CorrectOption,
  Quiz,
  QuizPreviewResult,
} from '../../types/quiz'
import { CORRECT_OPTIONS } from '../../config/quiz'
import { FormAlert } from '../auth/FormAlert'
import { Button } from '../ui/Button'
import { QuizPaperPreview } from './QuizPaperPreview'

const PREVIEW_DIALOG_CLASSES =
  'm-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto rounded-xl border border-hairline bg-surface p-0 text-ink shadow-elevated [&::backdrop]:bg-ink/60'

type QuizPreviewDialogProps = {
  quiz: Quiz
  accessToken: string
  onClose: () => void
}

export function QuizPreviewDialog({
  quiz,
  accessToken,
  onClose,
}: QuizPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [answers, setAnswers] = useState<Array<CorrectOption | null>>(
    () => quiz.questions.map(() => null),
  )
  const [result, setResult] = useState<QuizPreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Mount-only: the preview dialog opens when the component mounts.
    dialogRef.current?.showModal()
  }, [])

  const answeredCount = answers.filter(Boolean).length
  const allAnswered =
    quiz.questions.length > 0 && answeredCount === quiz.questions.length

  const setAnswer = (index: number, option: CorrectOption) => {
    setAnswers((current) =>
      current.map((value, currentIndex) =>
        currentIndex === index ? option : value,
      ),
    )
    setResult(null)
    setError(null)
  }

  const submit = async () => {
    if (!allAnswered || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const nextResult = await previewGrade(
        quiz.id,
        answers.filter((answer): answer is CorrectOption => answer !== null),
        accessToken,
      )
      setResult(nextResult)
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'We could not grade this quiz. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setAnswers(quiz.questions.map(() => null))
    setResult(null)
    setError(null)
  }

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-label="Quiz preview"
      className={PREVIEW_DIALOG_CLASSES}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <div className="flex items-center justify-between gap-sm border-b border-hairline p-md">
        <div>
          <p className="text-title text-ink">{quiz.title}</p>
          <p className="text-caption text-ink-muted">
            Teacher preview · {quiz.questions.length}{' '}
            {quiz.questions.length === 1 ? 'question' : 'questions'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz preview"
          className="inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="bg-canvas-soft p-md">
        {quiz.instructions && (
          <div className="mb-md rounded-lg border border-hairline bg-surface p-md">
            <p className="whitespace-pre-line text-body-sm text-ink-secondary">
              {quiz.instructions}
            </p>
          </div>
        )}

        {result ? (
          <section aria-labelledby="quiz-result-heading" className="space-y-md">
            <div className="rounded-lg border border-hairline bg-surface p-lg text-center">
              <h2 id="quiz-result-heading" className="text-heading-3">
                {result.passed ? 'Passed' : 'Not passed'}
              </h2>
              <p className="mt-xs text-heading-2 text-ink">
                {result.percentage}%
              </p>
              <p className="mt-xxs text-body-sm text-ink-muted">
                {result.score} of {result.maxScore} points · passing score{' '}
                {quiz.passingScore}%
              </p>
              <div
                aria-live="polite"
                className="mt-sm inline-flex items-center gap-xxs rounded-full border border-hairline bg-canvas-soft px-sm py-xxs text-body-sm text-ink"
              >
                {result.passed ? (
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
                {result.passed
                  ? 'This attempt would pass.'
                  : 'This attempt would not pass.'}
              </div>
            </div>

            <div className="rounded-lg border border-hairline bg-surface p-md">
              <h3 className="text-title text-ink">Answers</h3>
              <ol className="mt-sm space-y-xs">
                {result.results.map((item, index) => (
                  <li
                    key={item.questionId}
                    className="flex flex-wrap items-center justify-between gap-xs border-b border-hairline pb-xs last:border-0 last:pb-0"
                  >
                    <span className="text-body-sm text-ink">
                      Question {index + 1}: selected {item.selectedOption}
                    </span>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-xxs text-body-sm',
                        item.isCorrect
                          ? 'text-ink'
                          : 'text-accent-orange-deep',
                      )}
                    >
                      {item.isCorrect ? (
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
                      {item.isCorrect
                        ? 'Correct'
                        : `Correct answer: ${item.correctOption}`}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex justify-end gap-xs">
              <Button variant="utility" onClick={reset}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Try again
              </Button>
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </div>
          </section>
        ) : (
          <div
            className={clsx(
              quiz.mode === 'document' &&
                quiz.file &&
                'grid gap-md lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
            )}
          >
            {quiz.mode === 'document' && quiz.file && (
              <div className="min-w-0">
                <QuizPaperPreview
                  file={quiz.file}
                  accessToken={accessToken}
                  className="h-[65vh] w-full rounded-lg border border-hairline bg-surface"
                />
              </div>
            )}

            <div className="min-w-0">
              {quiz.mode === 'document' && !quiz.file && (
                <div className="rounded-lg border border-accent-orange-deep/30 bg-surface p-md">
                  <p className="text-body-sm text-ink">
                    Upload the quiz paper before previewing.
                  </p>
                </div>
              )}

              {quiz.mode === 'native' ? (
                <ol className="space-y-md">
                  {quiz.questions.map((question, index) => (
                    <li
                      key={question.id}
                      className="rounded-lg border border-hairline bg-surface p-md"
                    >
                      <fieldset>
                        <legend className="text-body-md font-medium text-ink">
                          {index + 1}. {question.prompt}
                        </legend>
                        <div className="mt-sm grid gap-xs sm:grid-cols-2">
                          {CORRECT_OPTIONS.map((option) => {
                            const optionText =
                              option === 'A'
                                ? question.optionA
                                : option === 'B'
                                  ? question.optionB
                                  : option === 'C'
                                    ? question.optionC
                                    : question.optionD

                            return (
                              <label
                                key={option}
                                className="flex min-h-11 cursor-pointer items-center gap-xs rounded-md border border-hairline px-sm py-xxs text-body-sm text-ink hover:bg-canvas-soft"
                              >
                                <input
                                  type="radio"
                                  name={`preview-question-${question.id}`}
                                  value={option}
                                  checked={answers[index] === option}
                                  onChange={() => setAnswer(index, option)}
                                  className="size-4 accent-primary"
                                />
                                <span className="font-medium">{option}.</span>
                                <span>{optionText}</span>
                              </label>
                            )
                          })}
                        </div>
                      </fieldset>
                    </li>
                  ))}
                </ol>
              ) : (
                <ol className="space-y-xs rounded-lg border border-hairline bg-surface p-md">
                  {quiz.questions.map((question, index) => (
                    <li
                      key={question.id}
                      className="flex flex-wrap items-center justify-between gap-sm border-b border-hairline py-xs last:border-0"
                    >
                      <span className="text-body-sm font-medium text-ink">
                        Question {index + 1}
                      </span>
                      <div
                        role="radiogroup"
                        aria-label={`Answer for question ${index + 1}`}
                        className="flex gap-xs"
                      >
                        {CORRECT_OPTIONS.map((option) => (
                          <label
                            key={option}
                            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border border-hairline text-body-sm text-ink hover:bg-canvas-soft"
                          >
                            <input
                              type="radio"
                              name={`preview-document-${question.id}`}
                              value={option}
                              checked={answers[index] === option}
                              onChange={() => setAnswer(index, option)}
                              className="sr-only"
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <div className="mt-md">
                <FormAlert message={error} />
              </div>

              <div className="mt-md flex flex-wrap items-center justify-between gap-sm">
                <p className="text-caption text-ink-muted">
                  {answeredCount}/{quiz.questions.length} answered
                </p>
                <Button
                  variant="primary"
                  onClick={() => void submit()}
                  disabled={!allAnswered || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  )}
                  {isSubmitting ? 'Grading…' : 'Submit preview'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </dialog>
  )
}
