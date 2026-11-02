import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export type ResultStatTone = 'sky' | 'purple' | 'green' | 'orange'

const TONE_CLASSES: Record<ResultStatTone, string> = {
  sky: 'bg-accent-sky text-ink',
  purple: 'bg-accent-purple text-ink',
  green: 'bg-accent-green text-ink',
  orange: 'bg-accent-orange text-ink',
}

type ResultStatCardProps = {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone: ResultStatTone
}

export function ResultStatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: ResultStatCardProps) {
  return (
    <div className="flex h-full items-start gap-sm rounded-lg border border-hairline bg-surface p-md shadow-soft">
      <span
        className={clsx(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          TONE_CLASSES[tone],
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-eyebrow uppercase tracking-wide text-ink-muted">
          {label}
        </p>
        <p className="mt-xxs text-title text-ink">{value}</p>
        <p className="mt-xxs text-caption text-ink-muted">{helper}</p>
      </div>
    </div>
  )
}
