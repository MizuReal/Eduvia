import { CheckCircle2, CircleAlert, Clock3 } from 'lucide-react'
import clsx from 'clsx'
import { RESULT_STATUS_LABELS } from './resultStatusLabels'
import type { QuizResultStatus } from '../../types/quizResults'

const STATUS_CONFIG: Record<
  QuizResultStatus,
  {
    label: string
    classes: string
    Icon: typeof CheckCircle2
  }
> = {
  passed: {
    label: RESULT_STATUS_LABELS.passed,
    classes: 'border-accent-green/40 bg-canvas-soft text-ink',
    Icon: CheckCircle2,
  },
  failed: {
    label: RESULT_STATUS_LABELS.failed,
    classes:
      'border-accent-orange-deep/30 bg-canvas-soft text-accent-orange-deep',
    Icon: CircleAlert,
  },
  not_taken: {
    label: RESULT_STATUS_LABELS.not_taken,
    classes: 'border-hairline bg-surface text-ink-muted',
    Icon: Clock3,
  },
}

type ResultStatusBadgeProps = {
  status: QuizResultStatus
}

export function ResultStatusBadge({ status }: ResultStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.Icon

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-xxs rounded-full border px-xs py-xxs text-eyebrow',
        config.classes,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </span>
  )
}
