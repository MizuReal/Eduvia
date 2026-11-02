import { CircleAlert, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { buttonClasses } from '../ui/buttonStyles'

export function ResultsSkeleton({ label }: { label: string }) {
  return (
    <div className="mt-xl" aria-busy="true">
      <div className="h-20 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="mt-md h-96 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function ResultsLoadError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="mt-xl max-w-card rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
    >
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <p className="mt-xs text-body-sm text-ink">{message}</p>
      <Button variant="utility" onClick={onRetry} className="mt-sm">
        <RefreshCw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}

export function ResultsNotFound({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string
  description: string
  backHref: string
  backLabel: string
}) {
  return (
    <div className="mt-xl max-w-card rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <h2 className="mt-sm text-heading-3">{title}</h2>
      <p className="mt-xxs text-body-sm text-ink-muted">{description}</p>
      <Link to={backHref} className={buttonClasses('utility', 'mt-md')}>
        {backLabel}
      </Link>
    </div>
  )
}
