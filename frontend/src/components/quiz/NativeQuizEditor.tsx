import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Save, Send, Eye, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { FormAlert } from '../auth/FormAlert'
import { FieldError } from '../auth/FieldError'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import { ConfirmDeleteDialog } from '../teacher/ConfirmDeleteDialog'
import { Button } from '../ui/Button'
import {
  MAX_QUIZ_QUESTIONS,
  MIN_QUIZ_QUESTIONS,
  QUIZ_INSTRUCTIONS_MAX_LENGTH,
  QUIZ_TITLE_MAX_LENGTH,
} from '../../config/quiz'
import {
  nativeQuizFormSchema,
  type NativeQuestionFormValues,
  type NativeQuizFormValues,
} from '../../schemas/quiz'
import { ApiError } from '../../services/apiClient'
import {
  deleteQuiz,
  publishQuiz,
  saveQuiz,
} from '../../services/quizService'
import type { CorrectOption, Quiz } from '../../types/quiz'
import { QuizPreviewDialog } from './QuizPreviewDialog'
import { QuizQuestionCard } from './QuizQuestionCard'
import { QuizStatusBadge } from './QuizStatusBadge'

type NativeQuizEditorProps = {
  quiz: Quiz
  accessToken: string
  onUpdated: (quiz: Quiz) => void
  onDeleted: () => void
  onDirtyChange: (dirty: boolean) => void
}

function emptyQuestion(): NativeQuestionFormValues {
  return {
    prompt: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: '',
    explanation: '',
  }
}

function toFormValues(quiz: Quiz): NativeQuizFormValues {
  return {
    title: quiz.title,
    instructions: quiz.instructions,
    passingScore: quiz.passingScore,
    questions: quiz.questions.map((question) => ({
      prompt: question.prompt ?? '',
      optionA: question.optionA ?? '',
      optionB: question.optionB ?? '',
      optionC: question.optionC ?? '',
      optionD: question.optionD ?? '',
      correctOption: question.correctOption,
      explanation: question.explanation ?? '',
    })),
  }
}

export function NativeQuizEditor({
  quiz,
  accessToken,
  onUpdated,
  onDeleted,
  onDirtyChange,
}: NativeQuizEditorProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null)
  const {
    register,
    control,
    getValues,
    reset,
    trigger,
    formState: { errors, isDirty },
  } = useForm<NativeQuizFormValues>({
    resolver: zodResolver(nativeQuizFormSchema),
    defaultValues: toFormValues(quiz),
  })
  const { fields, append, remove, move, insert } = useFieldArray({
    control,
    name: 'questions',
  })

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(
    () => () => {
      onDirtyChange(false)
    },
    [onDirtyChange],
  )

  const save = async (): Promise<Quiz | null> => {
    const valid = await trigger()

    if (!valid) {
      return null
    }

    setIsSaving(true)
    setServerError(null)

    try {
      const values = getValues()
      const saved = await saveQuiz(
        quiz.id,
        {
          title: values.title,
          instructions: values.instructions,
          passingScore: values.passingScore,
          questions: values.questions.map((question) => ({
            prompt: question.prompt,
            optionA: question.optionA,
            optionB: question.optionB,
            optionC: question.optionC,
            optionD: question.optionD,
            correctOption: question.correctOption as CorrectOption,
            explanation: question.explanation,
          })),
        },
        accessToken,
      )

      onUpdated(saved)
      reset(toFormValues(saved))
      return saved
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'We could not save this quiz. Try again.',
      )
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const publish = async () => {
    const saved = await save()

    if (!saved) {
      return
    }

    if (
      saved.questions.length < MIN_QUIZ_QUESTIONS ||
      saved.questions.length > MAX_QUIZ_QUESTIONS
    ) {
      setServerError(
        `A quiz must have between ${MIN_QUIZ_QUESTIONS} and ${MAX_QUIZ_QUESTIONS} questions to publish.`,
      )
      return
    }

    setIsSaving(true)
    setServerError(null)

    try {
      const published = await publishQuiz(saved.id, accessToken)
      onUpdated(published)
      reset(toFormValues(published))
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'We could not publish this quiz. Try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const preview = async () => {
    const saved = await save()

    if (!saved) {
      return
    }

    setPreviewQuiz(saved)
    setIsPreviewOpen(true)
  }

  const duplicate = (index: number) => {
    if (fields.length >= MAX_QUIZ_QUESTIONS) {
      return
    }

    const value = getValues(`questions.${index}`)
    insert(index + 1, {
      ...value,
      prompt: value.prompt ? `${value.prompt} (copy)` : '',
    })
  }

  return (
    <>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
        className="space-y-md"
      >
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex items-center gap-sm">
            <QuizStatusBadge status={quiz.status} />
            <span className="text-caption text-ink-muted">
              {fields.length}/{MAX_QUIZ_QUESTIONS} questions
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-xxs">
            <Button
              type="button"
              variant="utility"
              onClick={() => setIsDeleting(true)}
              disabled={isSaving}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete quiz
            </Button>
            <Button
              type="button"
              variant="utility"
              onClick={() => void preview()}
              disabled={isSaving}
            >
              <Eye className="size-4" aria-hidden="true" />
              Preview
            </Button>
            <Button
              type="submit"
              variant="utility"
              disabled={isSaving}
            >
              <Save className="size-4" aria-hidden="true" />
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void publish()}
              disabled={isSaving}
            >
              <Send className="size-4" aria-hidden="true" />
              {quiz.status === 'published' ? 'Publish changes' : 'Publish'}
            </Button>
          </div>
        </div>

        <FormAlert message={serverError} />

        <section
          aria-labelledby="quiz-settings-heading"
          className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
        >
          <h2 id="quiz-settings-heading" className="text-title text-ink">
            Quiz settings
          </h2>
          <div className="mt-md grid gap-md md:grid-cols-[minmax(0,1fr)_10rem]">
            <div>
              <label htmlFor="quiz-title" className={FIELD_LABEL_CLASSES}>
                Title
              </label>
              <input
                id="quiz-title"
                type="text"
                maxLength={QUIZ_TITLE_MAX_LENGTH}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'quiz-title-error' : undefined}
                className={FIELD_INPUT_CLASSES}
                {...register('title')}
              />
              <FieldError id="quiz-title-error" message={errors.title?.message} />
            </div>
            <div>
              <label
                htmlFor="quiz-passing-score"
                className={FIELD_LABEL_CLASSES}
              >
                Passing score (%)
              </label>
              <input
                id="quiz-passing-score"
                type="number"
                min={0}
                max={100}
                aria-invalid={Boolean(errors.passingScore)}
                aria-describedby={
                  errors.passingScore ? 'quiz-passing-score-error' : undefined
                }
                className={FIELD_INPUT_CLASSES}
                {...register('passingScore', { valueAsNumber: true })}
              />
              <FieldError
                id="quiz-passing-score-error"
                message={errors.passingScore?.message}
              />
            </div>
          </div>

          <div className="mt-md">
            <label htmlFor="quiz-instructions" className={FIELD_LABEL_CLASSES}>
              Instructions (optional)
            </label>
            <textarea
              id="quiz-instructions"
              rows={3}
              maxLength={QUIZ_INSTRUCTIONS_MAX_LENGTH}
              className={FIELD_INPUT_CLASSES}
              {...register('instructions')}
            />
            <p className={FIELD_HINT_CLASSES}>
              Shown to learners before they answer.
            </p>
          </div>
        </section>

        <section aria-labelledby="quiz-questions-heading">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <div>
              <h2 id="quiz-questions-heading" className="text-heading-3">
                Questions
              </h2>
              <p className="mt-xxs text-body-sm text-ink-muted">
                {MIN_QUIZ_QUESTIONS}–{MAX_QUIZ_QUESTIONS} questions are required
                to publish. Each question has one correct A–D option.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => append(emptyQuestion())}
              disabled={fields.length >= MAX_QUIZ_QUESTIONS || isSaving}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add question
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="mt-md rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
              <p className="text-body-sm text-ink-muted">
                No questions yet. Add your first question.
              </p>
            </div>
          ) : (
            <ol className="mt-md space-y-md">
              {fields.map((field, index) => (
                <QuizQuestionCard
                  key={field.id}
                  index={index}
                  register={register}
                  errors={errors}
                  canMoveUp={index > 0}
                  canMoveDown={index < fields.length - 1}
                  onMoveUp={() => move(index, index - 1)}
                  onMoveDown={() => move(index, index + 1)}
                  onDuplicate={() => duplicate(index)}
                  onRemove={() => remove(index)}
                />
              ))}
            </ol>
          )}
        </section>
      </form>

      {isDeleting && (
        <ConfirmDeleteDialog
          title="Delete quiz?"
          description="Delete this quiz and its questions? You can create a new one afterwards."
          onConfirm={async () => {
            await deleteQuiz(quiz.id, accessToken)
            setIsDeleting(false)
            onDeleted()
          }}
          onClose={() => setIsDeleting(false)}
        />
      )}

      {isPreviewOpen && previewQuiz && (
        <QuizPreviewDialog
          quiz={previewQuiz}
          accessToken={accessToken}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  )
}
