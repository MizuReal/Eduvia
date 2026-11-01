import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  TOPIC_TITLE_MAX_LENGTH,
  TOPIC_TITLE_MIN_LENGTH,
} from '../../config/course'
import { createTopicSchema } from '../../schemas/courseOutline'
import { ApiError } from '../../services/apiClient'
import type { CourseTopic, CreateTopicInput } from '../../types/courseOutline'
import { FieldError } from '../auth/FieldError'
import { FormAlert } from '../auth/FormAlert'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import { Button } from '../ui/Button'

type TopicFormProps = {
  onCreate: (input: CreateTopicInput) => Promise<CourseTopic>
}

export function TopicForm({ onCreate }: TopicFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateTopicInput>({
    resolver: zodResolver(createTopicSchema),
    defaultValues: { title: '' },
  })

  const submit = handleSubmit(async (values) => {
    setServerError(null)
    setSuccessMessage(null)

    try {
      await onCreate(values)
      reset()
      setSuccessMessage('Topic added.')
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_ERROR') {
          for (const detail of error.details ?? []) {
            if (detail.path === 'title') {
              setError('title', { type: 'server', message: detail.message })
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
      aria-labelledby="add-topic-heading"
      className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <h2 id="add-topic-heading" className="text-heading-3">
        Add topic
      </h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        Topics are the sections of your table of contents.
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
          <label htmlFor="topic-title" className={FIELD_LABEL_CLASSES}>
            Topic title
          </label>
          <input
            id="topic-title"
            type="text"
            autoComplete="off"
            maxLength={TOPIC_TITLE_MAX_LENGTH}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={
              errors.title
                ? 'topic-title-hint topic-title-error'
                : 'topic-title-hint'
            }
            className={FIELD_INPUT_CLASSES}
            {...register('title', {
              onChange: () => {
                clearErrors('title')
                setServerError(null)
                setSuccessMessage(null)
              },
            })}
          />
          <p id="topic-title-hint" className={FIELD_HINT_CLASSES}>
            {TOPIC_TITLE_MIN_LENGTH}–{TOPIC_TITLE_MAX_LENGTH} characters.
          </p>
          <FieldError id="topic-title-error" message={errors.title?.message} />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding topic…' : 'Add topic'}
        </Button>
      </form>
    </section>
  )
}
