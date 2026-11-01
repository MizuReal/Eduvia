import { useEffect, useId, useRef } from 'react'
import {
  DANGER_BUTTON_CLASSES,
  DIALOG_ACTIONS_CLASSES,
  DIALOG_CLASSES,
} from '../teacher/dialogStyles'
import { Button } from '../ui/Button'

type ConfirmDialogProps = {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  danger?: boolean
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  danger = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    // Mount-only: the dialog only renders while a confirmation is pending.
    dialogRef.current?.showModal()
  }, [])

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
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
          {title}
        </h2>
        <p id={descriptionId} className="mt-xxs text-body-sm text-ink-muted">
          {description}
        </p>

        <div className={DIALOG_ACTIONS_CLASSES}>
          <Button variant="utility" onClick={onClose}>
            Cancel
          </Button>
          {danger ? (
            <button
              type="button"
              className={DANGER_BUTTON_CLASSES}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          ) : (
            <Button variant="primary" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  )
}
