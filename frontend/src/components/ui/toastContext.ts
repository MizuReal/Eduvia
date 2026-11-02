import { createContext, useContext } from 'react'

export type ToastContextValue = {
  showToast: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)

  if (!value) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return value
}
