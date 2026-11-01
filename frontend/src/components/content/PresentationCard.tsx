import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Pencil,
  Presentation,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { formatContentDate, formatFileSize } from '../../config/content'
import { ApiError } from '../../services/apiClient'
import { getFileUrl } from '../../services/topicContentService'
import type { PresentationContentItem } from '../../types/topicContent'
import { openSignedUrl } from './openSignedUrl'
import { Button } from '../ui/Button'

type PresentationCardProps = {
  item: PresentationContentItem
  accessToken: string
  onDelete: () => void
  onEdit: () => void
  onReplace: () => void
}

function StatusBadge({ status }: { status: PresentationContentItem['file']['status'] }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-xxs rounded-full border border-accent-green/40 bg-canvas-soft px-xs py-xxs text-eyebrow text-ink">
        <CheckCircle2 className="size-3.5 text-accent-green" aria-hidden="true" />
        Ready
      </span>
    )
  }

  if (status === 'processing' || status === 'uploading') {
    return (
      <span className="inline-flex items-center gap-xxs rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Processing
      </span>
    )
  }

  if (status === 'quarantined') {
    return (
      <span className="inline-flex items-center gap-xxs rounded-full border border-accent-orange-deep/40 bg-canvas-soft px-xs py-xxs text-eyebrow text-ink">
        <ShieldAlert
          className="size-3.5 text-accent-orange-deep"
          aria-hidden="true"
        />
        Quarantined
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-xxs rounded-full border border-accent-orange-deep/40 bg-canvas-soft px-xs py-xxs text-eyebrow text-ink">
      <CircleAlert
        className="size-3.5 text-accent-orange-deep"
        aria-hidden="true"
      />
      Failed
    </span>
  )
}

export function PresentationCard({
  item,
  accessToken,
  onDelete,
  onEdit,
  onReplace,
}: PresentationCardProps) {
  const [isOpening, setIsOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  const openFile = async () => {
    if (isOpening) {
      return
    }

    setIsOpening(true)
    setOpenError(null)

    try {
      const file = await getFileUrl(item.file.id, accessToken)
      openSignedUrl(file.url)
    } catch (error) {
      setOpenError(
        error instanceof ApiError
          ? error.message
          : 'We could not open this presentation. Try again.',
      )
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <li className="rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <div className="flex items-start gap-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-canvas-soft">
          <Presentation className="size-5 text-ink-secondary" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-xs">
            <h3 className="min-w-0 truncate text-title text-ink">
              {item.title}
            </h3>
            <StatusBadge status={item.file.status} />
          </div>
          <p className="mt-xxs text-caption text-ink-muted">
            {item.file.originalName} · {formatFileSize(item.file.sizeBytes)} ·
            Updated {formatContentDate(item.updatedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${item.title}`}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-accent-orange-deep hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-sm whitespace-pre-line text-body-sm text-ink-secondary">
        {item.summary}
      </p>

      {openError && (
        <p
          role="alert"
          className="mt-sm flex items-start gap-xxs text-caption text-accent-orange-deep"
        >
          <CircleAlert
            className="mt-xxs size-4 shrink-0"
            aria-hidden="true"
          />
          {openError}
        </p>
      )}

      <div className="mt-md flex flex-wrap items-center justify-end gap-xs">
        <Button
          variant="utility"
          onClick={onReplace}
          disabled={isOpening}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Replace
        </Button>
        <Button
          variant="utility"
          onClick={onEdit}
          disabled={isOpening}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit summary
        </Button>
        <Button
          variant="primary"
          onClick={() => void openFile()}
          disabled={isOpening || item.file.status !== 'ready'}
        >
          {isOpening ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Presentation className="size-4" aria-hidden="true" />
          )}
          {isOpening
            ? 'Opening…'
            : item.file.mimeType === 'application/pdf'
              ? 'Open PDF'
              : 'Download PPTX'}
        </Button>
      </div>
    </li>
  )
}
