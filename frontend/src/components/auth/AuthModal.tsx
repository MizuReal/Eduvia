import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { AuthMode } from '../../types/auth'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { SWITCH_BUTTON_CLASSES } from './formStyles'

type AuthModalProps = {
  isOpen: boolean
  mode: AuthMode
  onClose: () => void
  onModeChange: (mode: AuthMode) => void
}

export function AuthModal({
  isOpen,
  mode,
  onClose,
  onModeChange,
}: AuthModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isRegister = mode === 'register'

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    document.body.classList.add('overflow-hidden')

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const dialog = dialogRef.current
    dialog?.querySelector<HTMLInputElement>('input')?.focus()
  }, [isOpen, mode])

  useEffect(() => {
    const dialog = dialogRef.current

    return () => {
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="auth-dialog-title"
      aria-describedby="auth-dialog-description"
      className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-modal overflow-y-auto rounded-xl border border-hairline bg-surface p-0 text-ink shadow-elevated [&::backdrop]:bg-ink/40"
      onClose={onClose}
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
      {isOpen && (
        <div className="p-lg">
          <div className="flex items-start justify-between gap-md">
            <div>
              <h2 id="auth-dialog-title" className="text-heading-3">
                {isRegister ? 'Create your Eduvia account' : 'Sign in to Eduvia'}
              </h2>
              <p
                id="auth-dialog-description"
                className="mt-xxs text-body-sm text-ink-muted"
              >
                {isRegister
                  ? 'A username, a password, and your faculty are all we need.'
                  : 'Use your Eduvia username and password.'}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {isRegister ? (
            <RegisterForm onSuccess={onClose} />
          ) : (
            <LoginForm onSuccess={onClose} />
          )}

          <p className="mt-lg border-t border-hairline pt-md text-body-sm text-ink-muted">
            {isRegister ? 'Already have an account?' : 'New to Eduvia?'}{' '}
            <button
              type="button"
              className={SWITCH_BUTTON_CLASSES}
              onClick={() => onModeChange(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      )}
    </dialog>
  )
}
