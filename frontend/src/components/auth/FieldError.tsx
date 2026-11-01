import { CircleAlert } from 'lucide-react'

type FieldErrorProps = {
  id: string
  message?: string
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null
  }

  return (
    <p
      id={id}
      className="mt-xxs flex items-start gap-xxs text-caption text-accent-orange-deep"
    >
      <CircleAlert className="mt-xxs size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}
