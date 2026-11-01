import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import clsx from 'clsx'
import {
  ImageOff,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AltTextDialog } from './AltTextDialog'
import { useTopicAsset } from './useTopicAsset'

export function CourseImageNodeView({
  node,
  editor,
  selected,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const fileId =
    typeof node.attrs.fileId === 'string' ? node.attrs.fileId : ''
  const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : ''
  const { asset, refreshAsset } = useTopicAsset(fileId)
  const [isAltOpen, setIsAltOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [asset?.url])

  const refresh = async () => {
    setIsRefreshing(true)
    await refreshAsset(fileId)
    setIsRefreshing(false)
  }

  const displayAlt = alt || asset?.originalName || 'Course image'
  const canShowImage = Boolean(asset?.url) && !imageFailed

  return (
    <NodeViewWrapper
      className="my-sm"
      contentEditable={false}
      data-drag-handle
    >
      <figure
        className={clsx(
          'overflow-hidden rounded-lg border bg-canvas-soft',
          selected ? 'border-primary ring-2 ring-primary/20' : 'border-hairline',
        )}
      >
        {canShowImage && asset?.url ? (
          <img
            src={asset.url}
            alt={displayAlt}
            width={asset.width ?? undefined}
            height={asset.height ?? undefined}
            loading="lazy"
            decoding="async"
            className="h-auto max-h-[32rem] w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-sm px-lg py-xl text-center">
            <ImageOff
              className="size-8 text-ink-faint"
              aria-hidden="true"
            />
            <p className="text-body-sm text-ink-muted">
              {asset?.url
                ? 'This image could not be loaded.'
                : 'This image is not available.'}
            </p>
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
              {isRefreshing ? 'Refreshing…' : 'Retry'}
            </button>
          </div>
        )}

        {editor.isEditable && (
          <figcaption className="flex flex-wrap items-center justify-between gap-xs border-t border-hairline bg-surface px-sm py-xxs">
            <p className="min-w-0 flex-1 truncate text-caption text-ink-muted">
              {alt ? `Alt: ${alt}` : 'No alt text set'}
            </p>
            <div className="flex items-center gap-xxs">
              <button
                type="button"
                onClick={() => setIsAltOpen(true)}
                aria-label="Edit image alt text"
                className="inline-flex min-h-11 items-center gap-xxs rounded-md px-xs text-body-sm text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Pencil className="size-4" aria-hidden="true" />
                Alt text
              </button>
              <button
                type="button"
                onClick={() => deleteNode()}
                aria-label="Remove image"
                className="inline-flex min-h-11 items-center gap-xxs rounded-md px-xs text-body-sm text-accent-orange-deep hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Remove
              </button>
            </div>
          </figcaption>
        )}
      </figure>

      {isAltOpen && (
        <AltTextDialog
          initialValue={alt}
          onSave={(nextAlt) => {
            updateAttributes({ alt: nextAlt.length > 0 ? nextAlt : null })
            setIsAltOpen(false)
          }}
          onClose={() => setIsAltOpen(false)}
        />
      )}
    </NodeViewWrapper>
  )
}
