type CourseProgressBarProps = {
  completed: number
  total: number
  percent: number
}

export function CourseProgressBar({
  completed,
  total,
  percent,
}: CourseProgressBarProps) {
  return (
    <div className="mt-md rounded-lg border border-hairline bg-surface p-md">
      <div className="flex items-center justify-between gap-sm">
        <p className="text-body-sm font-medium text-ink">Course progress</p>
        <p className="text-caption text-ink-muted">
          {completed} of {total} topics complete
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Course progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-xs h-2 overflow-hidden rounded-full bg-canvas-soft"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

type TopicProgressBarProps = {
  value: number
  total: number
  label: string
}

export function TopicProgressBar({
  value,
  total,
  label,
}: TopicProgressBarProps) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-sm">
        <p className="text-caption text-ink-muted">{label}</p>
        <p className="text-caption text-ink-muted">
          {value} of {total} · {percent}%
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-xxs h-2 overflow-hidden rounded-full bg-canvas-soft"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
