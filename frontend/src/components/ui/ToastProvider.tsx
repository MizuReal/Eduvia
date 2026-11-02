import { CheckCircle2, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './toastContext'
import type { ToastContextValue } from './toastContext'

const TOAST_DURATION_MS = 5000

type ToastState = {
  id: number
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const nextIdRef = useRef(0)

  const dismiss = useCallback(() => setToast(null), [])

  const showToast = useCallback((message: string) => {
    nextIdRef.current += 1
    setToast({ id: nextIdRef.current, message })
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(dismiss, TOAST_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [dismiss, toast])

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-md bottom-md z-50 flex justify-center print:hidden sm:justify-end">
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-auto flex w-full max-w-modal items-start gap-sm rounded-xl border border-hairline bg-surface p-sm px-md text-body-sm text-ink shadow-elevated"
          >
            <CheckCircle2
              className="mt-xxs size-5 shrink-0 text-accent-green"
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 py-xxs">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={dismiss}
              className="-m-xxs inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
