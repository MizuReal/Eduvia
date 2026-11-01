import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  LESSON_TITLE_MAX_LENGTH,
  LESSON_TITLE_MIN_LENGTH,
} from '../../config/course'
import { createLessonSchema } from '../../schemas/courseOutline'
import { ApiError } from '../../services/apiClient'
import type {
  CourseTopic,
  CreateLessonInput,
  Lesson,
} from '../../types/courseOutline'
import { FieldError } from '../auth/FieldError'
import { FormAlert } from '../auth/FormAlert'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import { Button } from '../ui/Button'

type LessonFormProps = {
  topics: CourseTopic[]
  onCreate: (input: CreateLessonInput) => Promise<Lesson>
}

export function LessonForm({ topics, onCreate }: LessonFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateLessonInput>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: { topicId: '', title: '' },
  })

  const hasTopics = topics.length > 0

  const submit = handleSubmit(async (values) => {
    setServerError(null)
    setSuccessMessage(null)

    try {
      await onCreate(values)
      reset({ topicId: getValues('topicId'), title: '' })
      setSuccessMessage('Lesson added.')
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'TOPIC_NOT_FOUND') {
          setError('topicId', { type: 'server', message: error.message })
        }

        if (error.code === 'VALIDATION_ERROR') {
          for (const detail of error.details ?? []) {
            if (detail.path === 'topicId' || detail.path === 'title') {
              setError(detail.path, {
                type: 'server',
                message: detail.message,
              })
            }
          }
        }

        setServerError(error.message)
      } else {
        setServerError('Something went wrong. Try again.')
      }
    }
  })

  return (
    <section
      aria-labelledby="add-lesson-heading"
      className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <h2 id="add-lesson-heading" className="text-heading-3">
        Add lesson
      </h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        Add a lesson to a topic in your table of contents.
      </p>

      <form
        noValidate
        aria-busy={isSubmitting}
        onSubmit={submit}
        className="mt-md space-y-md"
      >
        <FormAlert message={serverError} />

        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-xs rounded-md border border-accent-green/30 bg-canvas-soft p-sm text-body-sm text-ink"
          >
            <CheckCircle2
              className="mt-xxs size-4 shrink-0 text-accent-green"
              aria-hidden="true"
            />
            <p>{successMessage}</p>
          </div>
        )}

        <div>
          <label htmlFor="lesson-topic" className={FIELD_LABEL_CLASSES}>
            Topic
          </label>
          <select
            id="lesson-topic"
            aria-invalid={Boolean(errors.topicId)}
            aria-describedby={
              errors.topicId
                ? 'lesson-topic-hint lesson-topic-error'
                : 'lesson-topic-hint'
            }
            disabled={!hasTopics}
            className={FIELD_INPUT_CLASSES}
            {...register('topicId', {
              onChange: () => {
                clearErrors('topicId')
                setServerError(null)
                setSuccessMessage(null)
              },
            })}
          >
            <option value="" disabled>
              Select topic
            </option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
          <p id="lesson-topic-hint" className={FIELD_HINT_CLASSES}>
            {hasTopics
              ? 'Choose where this lesson belongs.'
              : 'Add a topic first.'}
          </p>
          <FieldError
            id="lesson-topic-error"
            message={errors.topicId?.message}
          />
        </div>

        <div>
          <label htmlFor="lesson-title" className={FIELD_LABEL_CLASSES}>
            Lesson title
          </label>
          <input
            id="lesson-title"
            type="text"
            autoComplete="off"
            maxLength={LESSON_TITLE_MAX_LENGTH}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={
              errors.title
                ? 'lesson-title-hint lesson-title-error'
                : 'lesson-title-hint'
            }
            disabled={!hasTopics}
            className={FIELD_INPUT_CLASSES}
            {...register('title', {
              onChange: () => {
                clearErrors('title')
                setServerError(null)
                setSuccessMessage(null)
              },
            })}
          />
          <p id="lesson-title-hint" className={FIELD_HINT_CLASSES}>
            {LESSON_TITLE_MIN_LENGTH}–{LESSON_TITLE_MAX_LENGTH} characters.
          </p>
          <FieldError id="lesson-title-error" message={errors.title?.message} />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!hasTopics || isSubmitting}
        >
          {isSubmitting ? 'Adding lesson…' : 'Add lesson'}
        </Button>
      </form>
    </section>
  )
}
