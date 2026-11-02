import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ListChecks,
  Lock,
} from 'lucide-react'
import clsx from 'clsx'
import type { TopicLearningStatus } from '../../types/learning'

const STATUS_CONFIG: Record<
  TopicLearningStatus,
  {
    label: string
    classes: string
    Icon: typeof CheckCircle2
  }
> = {
  locked: {
    label: 'Locked',
    classes: 'border-hairline bg-canvas-soft text-ink-muted',
    Icon: Lock,
  },
  not_started: {
    label: 'Not finished',
    classes: 'border-hairline bg-surface text-ink-muted',
    Icon: Clock3,
  },
  in_progress: {
    label: 'In progress',
    classes: 'border-primary/30 bg-canvas-soft text-primary',
    Icon: Clock3,
  },
  ready: {
    label: 'Ready for quiz',
    classes: 'border-primary/30 bg-canvas-soft text-primary',
    Icon: ListChecks,
  },
  not_passed: {
    label: 'Not passed',
    classes: 'border-accent-orange-deep/30 bg-canvas-soft text-accent-orange-deep',
    Icon: CircleAlert,
  },
  passed: {
    label: 'Passed',
    classes: 'border-accent-green/40 bg-canvas-soft text-ink',
    Icon: CheckCircle2,
  },
  completed: {
    label: 'Completed',
    classes: 'border-accent-green/40 bg-canvas-soft text-ink',
    Icon: CheckCircle2,
  },
}

type TopicStatusBadgeProps = {
  status: TopicLearningStatus
}

export function TopicStatusBadge({ status }: TopicStatusBadgeProps) {
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
