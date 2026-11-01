import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import clsx from 'clsx'
import {
  CircleAlert,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { formatFileSize } from '../../config/content'
import { openSignedUrl } from './openSignedUrl'
import { useTopicAsset } from './useTopicAsset'

export function CourseFileNodeView({
  node,
  editor,
  selected,
  deleteNode,
}: NodeViewProps) {
  const fileId =
    typeof node.attrs.fileId === 'string' ? node.attrs.fileId : ''
  const { asset, refreshAsset } = useTopicAsset(fileId)
  const [isOpening, setIsOpening] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  const refresh = async () => {
    setIsRefreshing(true)
    await refreshAsset(fileId)
    setIsRefreshing(false)
  }

  const openFile = async () => {
    if (isOpening) {
      return
    }

    setIsOpening(true)
    setOpenError(null)

    try {
      const refreshed = await refreshAsset(fileId)
      const url = refreshed?.url ?? asset?.url

      if (!url) {
        setOpenError('This file is not available right now.')
        return
      }

      openSignedUrl(url)
    } catch {
      setOpenError('We could not open this file. Try again.')
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <NodeViewWrapper
      className="my-sm"
      contentEditable={false}
      data-drag-handle
    >
      <div
        className={clsx(
          'flex flex-wrap items-center gap-sm rounded-lg border bg-surface p-sm',
          selected ? 'border-primary ring-2 ring-primary/20' : 'border-hairline',
        )}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-canvas-soft">
          <FileText className="size-5 text-ink-secondary" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-ink">
            {asset?.originalName ?? 'File unavailable'}
          </p>
          <p className="mt-xxs text-caption text-ink-muted">
            {asset
              ? `${asset.mimeType} · ${formatFileSize(asset.sizeBytes)}`
              : 'This attachment could not be loaded.'}
          </p>
        </div>

        <div className="flex items-center gap-xxs">
          {asset ? (
            <button
              type="button"
              onClick={() => void openFile()}
              disabled={isOpening}
              className="inline-flex min-h-11 items-center gap-xxs rounded-md border border-hairline bg-surface px-md py-xxs text-body-sm text-ink hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              {isOpening ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileText className="size-4" aria-hidden="true" />
              )}
              {isOpening ? 'Opening…' : 'Open file'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="inline-flex min-h-11 items-center gap-xxs rounded-md border border-hairline bg-surface px-md py-xxs text-body-sm text-ink hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              <RefreshCw
                className={clsx('size-4', isRefreshing && 'animate-spin')}
                aria-hidden="true"
              />
              Retry
            </button>
          )}

          {editor.isEditable && (
            <button
              type="button"
              onClick={() => deleteNode()}
              aria-label="Remove attachment"
              className="inline-flex size-11 items-center justify-center rounded-md text-accent-orange-deep hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {openError && (
          <p
            role="alert"
            className="flex w-full items-start gap-xxs text-caption text-accent-orange-deep"
          >
            <CircleAlert
              className="mt-xxs size-4 shrink-0"
              aria-hidden="true"
            />
            {openError}
          </p>
        )}
      </div>
    </NodeViewWrapper>
  )
}
