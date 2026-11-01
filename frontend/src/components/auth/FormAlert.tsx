import { CircleAlert } from 'lucide-react'

type FormAlertProps = {
  message: string | null
}

export function FormAlert({ message }: FormAlertProps) {
  if (!message) {
    return null
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-xs rounded-md border border-accent-orange-deep/30 bg-canvas-soft p-sm text-body-sm text-accent-orange-deep"
    >
      <CircleAlert className="mt-xxs size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
