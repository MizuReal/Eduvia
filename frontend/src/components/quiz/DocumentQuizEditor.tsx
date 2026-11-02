import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, Save, Send, Trash2 } from 'lucide-react'
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
  MIN_QUIZ_QUESTIONS,
  QUIZ_INSTRUCTIONS_MAX_LENGTH,
  QUIZ_TITLE_MAX_LENGTH,
} from '../../config/quiz'
import {
  documentQuizFormSchema,
  type DocumentQuizFormValues,
} from '../../schemas/quiz'
import { ApiError } from '../../services/apiClient'
import {
  deleteQuiz,
  publishQuiz,
  saveQuiz,
} from '../../services/quizService'
import type { CorrectOption, Quiz } from '../../types/quiz'
import { AnswerKeyGrid } from './AnswerKeyGrid'
import { QuizPaperUpload } from './QuizPaperUpload'
import { QuizPreviewDialog } from './QuizPreviewDialog'
import { QuizStatusBadge } from './QuizStatusBadge'

type DocumentQuizEditorProps = {
  quiz: Quiz
  accessToken: string
  onUpdated: (quiz: Quiz) => void
  onDeleted: () => void
  onDirtyChange: (dirty: boolean) => void
}

function toFormValues(quiz: Quiz): DocumentQuizFormValues {
  const existing = quiz.questions.map((question) => ({
    correctOption: question.correctOption,
  }))
  const answers = Array.from(
    { length: Math.max(MIN_QUIZ_QUESTIONS, existing.length) },
    (_, index) => existing[index] ?? { correctOption: '' },
  )

  return {
    title: quiz.title,
    instructions: quiz.instructions,
    passingScore: quiz.passingScore,
    answers,
  }
}

export function DocumentQuizEditor({
  quiz,
  accessToken,
  onUpdated,
  onDeleted,
  onDirtyChange,
}: DocumentQuizEditorProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null)
  const {
    register,
    control,
    getValues,
    reset,
    trigger,
    formState: { errors, isDirty },
  } = useForm<DocumentQuizFormValues>({
    resolver: zodResolver(documentQuizFormSchema),
    defaultValues: toFormValues(quiz),
  })
  const { fields, replace } = useFieldArray({
    control,
    name: 'answers',
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

  const setQuestionCount = (count: number) => {
    const current = getValues('answers')
    replace(
      Array.from({ length: count }, (_, index) => ({
        correctOption: current[index]?.correctOption ?? '',
      })),
    )
  }

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
          answers: values.answers.map(
            (answer) => answer.correctOption as CorrectOption,
          ),
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

    if (!saved.file) {
      setServerError('Upload the quiz paper before publishing.')
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

    if (!saved.file) {
      setServerError('Upload the quiz paper before previewing.')
      return
    }

    setPreviewQuiz(saved)
    setIsPreviewOpen(true)
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
              {fields.length} questions
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
            <Button type="submit" variant="utility" disabled={isSaving}>
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
          aria-labelledby="quiz-document-settings-heading"
          className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
        >
          <h2
            id="quiz-document-settings-heading"
            className="text-title text-ink"
          >
            Quiz settings
          </h2>
          <div className="mt-md grid gap-md md:grid-cols-[minmax(0,1fr)_10rem]">
            <div>
              <label htmlFor="document-quiz-title" className={FIELD_LABEL_CLASSES}>
                Title
              </label>
              <input
                id="document-quiz-title"
                type="text"
                maxLength={QUIZ_TITLE_MAX_LENGTH}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={
                  errors.title ? 'document-quiz-title-error' : undefined
                }
                className={FIELD_INPUT_CLASSES}
                {...register('title')}
              />
              <FieldError
                id="document-quiz-title-error"
                message={errors.title?.message}
              />
            </div>
            <div>
              <label
                htmlFor="document-quiz-passing-score"
                className={FIELD_LABEL_CLASSES}
              >
                Passing score (%)
              </label>
              <input
                id="document-quiz-passing-score"
                type="number"
                min={0}
                max={100}
                aria-invalid={Boolean(errors.passingScore)}
                aria-describedby={
                  errors.passingScore
                    ? 'document-quiz-passing-score-error'
                    : undefined
                }
                className={FIELD_INPUT_CLASSES}
                {...register('passingScore', { valueAsNumber: true })}
              />
              <FieldError
                id="document-quiz-passing-score-error"
                message={errors.passingScore?.message}
              />
            </div>
          </div>

          <div className="mt-md">
            <label
              htmlFor="document-quiz-instructions"
              className={FIELD_LABEL_CLASSES}
            >
              Instructions (optional)
            </label>
            <textarea
              id="document-quiz-instructions"
              rows={3}
              maxLength={QUIZ_INSTRUCTIONS_MAX_LENGTH}
              className={FIELD_INPUT_CLASSES}
              {...register('instructions')}
            />
            <p className={FIELD_HINT_CLASSES}>
              Shown to learners before they open the paper.
            </p>
          </div>
        </section>

        <QuizPaperUpload
          quizId={quiz.id}
          accessToken={accessToken}
          file={quiz.file}
          onUpdated={(updated) => {
            onUpdated(updated)
          }}
        />

        <section className="rounded-lg border border-hairline bg-surface p-lg shadow-soft">
          <AnswerKeyGrid
            fields={fields}
            register={register}
            errors={errors}
            onCountChange={setQuestionCount}
          />
        </section>
      </form>

      {isDeleting && (
        <ConfirmDeleteDialog
          title="Delete quiz?"
          description="Delete this quiz, its paper, and its answer key?"
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
