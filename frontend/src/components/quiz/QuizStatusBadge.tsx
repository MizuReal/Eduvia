import { CheckCircle2, FilePenLine } from 'lucide-react'

type QuizStatusBadgeProps = {
  status: 'draft' | 'published'
}

export function QuizStatusBadge({ status }: QuizStatusBadgeProps) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-xxs rounded-full border border-accent-green/40 bg-canvas-soft px-xs py-xxs text-eyebrow text-ink">
        <CheckCircle2
          className="size-3.5 text-accent-green"
          aria-hidden="true"
        />
        Published
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-xxs rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink-muted">
      <FilePenLine className="size-3.5" aria-hidden="true" />
      Draft
    </span>
  )
}
