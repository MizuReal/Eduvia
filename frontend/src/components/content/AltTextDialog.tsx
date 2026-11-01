import { useEffect, useId, useRef, useState } from 'react'
import { ALT_TEXT_MAX_LENGTH } from '../../config/content'
import { altTextSchema } from '../../schemas/topicContent'
import {
  DIALOG_ACTIONS_CLASSES,
  DIALOG_CLASSES,
} from '../teacher/dialogStyles'
import { Button } from '../ui/Button'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import { FieldError } from '../auth/FieldError'

type AltTextDialogProps = {
  initialValue: string
  onSave: (alt: string) => void
  onClose: () => void
}

export function AltTextDialog({
  initialValue,
  onSave,
  onClose,
}: AltTextDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const inputId = useId()
  const errorId = useId()
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mount-only: the dialog is only rendered while alt text is being edited.
    dialogRef.current?.showModal()
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    const result = altTextSchema.safeParse(value)

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Use valid alt text.')
      return
    }

    onSave(result.data)
  }

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
          Image alt text
        </h2>
        <p className="mt-xxs text-body-sm text-ink-muted">
          Describe the image for screen readers. Leave it blank if the image is
          purely decorative.
        </p>

        <div className="mt-md">
          <label htmlFor={inputId} className={FIELD_LABEL_CLASSES}>
            Alt text
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            maxLength={ALT_TEXT_MAX_LENGTH}
            value={value}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={FIELD_INPUT_CLASSES}
            onChange={(event) => {
              setValue(event.target.value)
              setError(null)
            }}
          />
          <p className={FIELD_HINT_CLASSES}>250 characters or fewer.</p>
          <FieldError id={errorId} message={error ?? undefined} />
        </div>

        <div className={DIALOG_ACTIONS_CLASSES}>
          <Button variant="utility" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save alt text
          </Button>
        </div>
      </div>
    </dialog>
  )
}
