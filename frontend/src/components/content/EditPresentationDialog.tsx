import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import {
  CONTENT_TITLE_MAX_LENGTH,
  PRESENTATION_SUMMARY_MAX_LENGTH,
  PRESENTATION_SUMMARY_MIN_LENGTH,
} from '../../config/content'
import { presentationFormSchema } from '../../schemas/topicContent'
import type { PresentationFormValues } from '../../schemas/topicContent'
import { ApiError } from '../../services/apiClient'
import { updateContent } from '../../services/topicContentService'
import type { PresentationContentItem } from '../../types/topicContent'
import { FormAlert } from '../auth/FormAlert'
import { FieldError } from '../auth/FieldError'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import {
  DIALOG_ACTIONS_CLASSES,
  DIALOG_CLASSES,
} from '../teacher/dialogStyles'
import { Button } from '../ui/Button'

type EditPresentationDialogProps = {
  item: PresentationContentItem
  accessToken: string
  onClose: () => void
  onUpdated: (item: PresentationContentItem) => void
}

export function EditPresentationDialog({
  item,
  accessToken,
  onClose,
  onUpdated,
}: EditPresentationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const titleInputId = useId()
  const titleErrorId = useId()
  const summaryId = useId()
  const summaryHintId = useId()
  const summaryErrorId = useId()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PresentationFormValues>({
    resolver: zodResolver(presentationFormSchema),
    defaultValues: {
      title: item.title,
      summary: item.summary,
    },
  })

  useEffect(() => {
    // Mount-only: the dialog only renders while a presentation is being edited.
    dialogRef.current?.showModal()
  }, [])

  const summaryValue = useWatch({ control, name: 'summary' })
  const summaryLength = (summaryValue ?? '').length

  const submit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      const updated = await updateContent(
        item.id,
        { title: values.title, summary: values.summary },
        accessToken,
      )

      if (updated.kind !== 'presentation') {
        setServerError('We could not update this presentation. Try again.')
        return
      }

      onUpdated(updated)
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'We could not update this presentation. Try again.',
      )
    }
  })

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
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
        <h2 id={titleId} className="text-heading-3">
          Edit presentation details
        </h2>
        <p className="mt-xxs text-body-sm text-ink-muted">
          Update the title or summary without changing the uploaded file.
        </p>

        <form
          noValidate
          aria-busy={isSubmitting}
          onSubmit={submit}
          className="mt-md space-y-md"
        >
          <FormAlert message={serverError} />

          <div>
            <label htmlFor={titleInputId} className={FIELD_LABEL_CLASSES}>
              Title
            </label>
            <input
              id={titleInputId}
              type="text"
              maxLength={CONTENT_TITLE_MAX_LENGTH}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? titleErrorId : undefined}
              className={FIELD_INPUT_CLASSES}
              {...register('title')}
            />
            <FieldError id={titleErrorId} message={errors.title?.message} />
          </div>

          <div>
            <label htmlFor={summaryId} className={FIELD_LABEL_CLASSES}>
              Summary
            </label>
            <textarea
              id={summaryId}
              rows={5}
              maxLength={PRESENTATION_SUMMARY_MAX_LENGTH}
              aria-invalid={Boolean(errors.summary)}
              aria-describedby={
                errors.summary
                  ? `${summaryHintId} ${summaryErrorId}`
                  : summaryHintId
              }
              className={FIELD_INPUT_CLASSES}
              {...register('summary')}
            />
            <div className="flex items-start justify-between gap-sm">
              <p id={summaryHintId} className={FIELD_HINT_CLASSES}>
                Required, {PRESENTATION_SUMMARY_MIN_LENGTH}–
                {PRESENTATION_SUMMARY_MAX_LENGTH} characters.
              </p>
              <p className="mt-xxs shrink-0 text-caption text-ink-muted">
                {summaryLength}/{PRESENTATION_SUMMARY_MAX_LENGTH}
              </p>
            </div>
            <FieldError id={summaryErrorId} message={errors.summary?.message} />
          </div>

          <div className={DIALOG_ACTIONS_CLASSES}>
            <Button variant="utility" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
