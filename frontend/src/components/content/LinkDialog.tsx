import { useEffect, useId, useRef, useState } from 'react'
import { LINK_URL_MAX_LENGTH } from '../../config/content'
import { linkUrlSchema } from '../../schemas/topicContent'
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

type LinkDialogProps = {
  initialValue: string
  onSave: (href: string) => void
  onRemove?: () => void
  onClose: () => void
}

export function LinkDialog({
  initialValue,
  onSave,
  onRemove,
  onClose,
}: LinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const inputId = useId()
  const errorId = useId()
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mount-only: the dialog is only rendered while a link is being edited.
    dialogRef.current?.showModal()
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    const result = linkUrlSchema.safeParse(value)

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Use a valid link.')
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
          {initialValue ? 'Edit link' : 'Add link'}
        </h2>
        <p className="mt-xxs text-body-sm text-ink-muted">
          Use an http, https, or mailto address.
        </p>

        <div className="mt-md">
          <label htmlFor={inputId} className={FIELD_LABEL_CLASSES}>
            Link address
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            inputMode="url"
            maxLength={LINK_URL_MAX_LENGTH}
            value={value}
            placeholder="https://example.com"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={FIELD_INPUT_CLASSES}
            onChange={(event) => {
              setValue(event.target.value)
              setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
          />
          <p className={FIELD_HINT_CLASSES}>2,048 characters or fewer.</p>
          <FieldError id={errorId} message={error ?? undefined} />
        </div>

        <div className={DIALOG_ACTIONS_CLASSES}>
          {onRemove && (
            <Button
              variant="utility"
              onClick={onRemove}
              className="sm:mr-auto"
            >
              Remove link
            </Button>
          )}
          <Button variant="utility" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save link
          </Button>
        </div>
      </div>
    </dialog>
  )
}
