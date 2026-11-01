import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  TOPIC_TITLE_MAX_LENGTH,
  TOPIC_TITLE_MIN_LENGTH,
} from '../../config/course'
import { ApiError } from '../../services/apiClient'
import { FieldError } from '../auth/FieldError'
import { FormAlert } from '../auth/FormAlert'
import { FIELD_INPUT_CLASSES, FIELD_LABEL_CLASSES } from '../auth/formStyles'
import { Button } from '../ui/Button'
import { DIALOG_ACTIONS_CLASSES, DIALOG_CLASSES } from './dialogStyles'

const editTopicSchema = z.object({
  title: z
    .string()
    .trim()
    .min(
      TOPIC_TITLE_MIN_LENGTH,
      `Use ${TOPIC_TITLE_MIN_LENGTH}–${TOPIC_TITLE_MAX_LENGTH} characters.`,
    )
    .max(
      TOPIC_TITLE_MAX_LENGTH,
      `Use ${TOPIC_TITLE_MIN_LENGTH}–${TOPIC_TITLE_MAX_LENGTH} characters.`,
    ),
})

type EditTopicValues = z.infer<typeof editTopicSchema>

type EditTopicDialogProps = {
  title: string
  onSave: (title: string) => Promise<void>
  onClose: () => void
}

export function EditTopicDialog({
  title,
  onSave,
  onClose,
}: EditTopicDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditTopicValues>({
    resolver: zodResolver(editTopicSchema),
    defaultValues: { title },
  })

  useEffect(() => {
    // Mount-only: the dialog is rendered only while an edit is active.
    dialogRef.current?.showModal()
  }, [])

  const submit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      await onSave(values.title)
      onClose()
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Try again.',
      )
    }
  })

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="edit-topic-title"
      aria-describedby="edit-topic-description"
      className={DIALOG_CLASSES}
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
      <div className="p-lg">
        <h2 id="edit-topic-title" className="text-heading-3">
          Edit topic
        </h2>
        <p
          id="edit-topic-description"
          className="mt-xxs text-body-sm text-ink-muted"
        >
          Update the topic title in this subject.
        </p>

        <form
          noValidate
          aria-busy={isSubmitting}
          onSubmit={submit}
          className="mt-md"
        >
          <FormAlert message={serverError} />

          <div className="mt-md">
            <label
              htmlFor="edit-topic-title-input"
              className={FIELD_LABEL_CLASSES}
            >
              Topic title
            </label>
            <input
              id="edit-topic-title-input"
              type="text"
              autoComplete="off"
              maxLength={TOPIC_TITLE_MAX_LENGTH}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title
                  ? 'edit-topic-title-hint edit-topic-title-error'
                  : 'edit-topic-title-hint'
              }
              className={FIELD_INPUT_CLASSES}
              {...register('title')}
            />
            <p
              id="edit-topic-title-hint"
              className="mt-xxs text-caption text-ink-muted"
            >
              {TOPIC_TITLE_MIN_LENGTH}–{TOPIC_TITLE_MAX_LENGTH} characters.
            </p>
            <FieldError
              id="edit-topic-title-error"
              message={errors.title?.message}
            />
          </div>

          <div className={DIALOG_ACTIONS_CLASSES}>
            <Button type="button" variant="utility" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save topic'}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
