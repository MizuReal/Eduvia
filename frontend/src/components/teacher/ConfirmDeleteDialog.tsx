import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../services/apiClient'
import { FormAlert } from '../auth/FormAlert'
import { Button } from '../ui/Button'
import {
  DANGER_BUTTON_CLASSES,
  DIALOG_ACTIONS_CLASSES,
  DIALOG_CLASSES,
} from './dialogStyles'

type ConfirmDeleteDialogProps = {
  title: string
  description: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    // Mount-only: the dialog is rendered only while a delete is pending.
    dialogRef.current?.showModal()
  }, [])

  const confirm = async () => {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)
    setServerError(null)

    try {
      await onConfirm()
      onClose()
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Try again.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
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
        <h2 id="delete-dialog-title" className="text-heading-3">
          {title}
        </h2>
        <p
          id="delete-dialog-description"
          className="mt-xxs text-body-sm text-ink-muted"
        >
          {description}
        </p>

        <div className="mt-md">
          <FormAlert message={serverError} />
        </div>

        <div className={DIALOG_ACTIONS_CLASSES}>
          <Button
            type="button"
            variant="utility"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <button
            type="button"
            className={DANGER_BUTTON_CLASSES}
            onClick={confirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
