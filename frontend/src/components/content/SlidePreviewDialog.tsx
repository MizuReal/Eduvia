import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SlidesDocument, TopicAsset } from '../../types/topicContent'
import { TopicAssetProvider } from './TopicAssetProvider'
import { TiptapRenderer } from './TiptapRenderer'
import { Button } from '../ui/Button'

const PREVIEW_DIALOG_CLASSES =
  'm-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-xl border border-hairline bg-surface p-0 text-ink shadow-elevated [&::backdrop]:bg-ink/60'

type SlidePreviewDialogProps = {
  slides: SlidesDocument
  initialIndex: number
  assets: TopicAsset[]
  refreshAsset: (fileId: string) => Promise<TopicAsset | null>
  onClose: () => void
}

export function SlidePreviewDialog({
  slides,
  initialIndex,
  assets,
  refreshAsset,
  onClose,
}: SlidePreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(
    Math.min(Math.max(initialIndex, 0), slides.slides.length - 1),
  )

  useEffect(() => {
    // Mount-only: the preview dialog opens when the component mounts.
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setIndex((current) => Math.min(slides.slides.length - 1, current + 1))
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setIndex((current) => Math.max(0, current - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [slides.slides.length])

  const slide = slides.slides[index]
  const isFirst = index === 0
  const isLast = index === slides.slides.length - 1

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-label="Slide preview"
      className={PREVIEW_DIALOG_CLASSES}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <div className="flex items-center justify-between gap-sm border-b border-hairline p-md">
        <div>
          <p className="text-title text-ink">Slide preview</p>
          <p aria-live="polite" className="text-caption text-ink-muted">
            Slide {index + 1} of {slides.slides.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close slide preview"
          className="inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="bg-canvas-soft p-md sm:p-lg">
        {slide ? (
          <div className="mx-auto aspect-video w-full max-w-4xl overflow-y-auto rounded-lg border border-hairline bg-surface p-lg shadow-soft sm:p-xl">
            <TopicAssetProvider assets={assets} refreshAsset={refreshAsset}>
              <TiptapRenderer
                key={slide.id}
                content={slide.content}
                variant="slide"
                label={`Slide ${index + 1} content`}
              />
            </TopicAssetProvider>
          </div>
        ) : (
          <p className="text-center text-body-sm text-ink-muted">
            This presentation has no slides.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-sm border-t border-hairline p-md">
        <Button
          variant="utility"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={isFirst}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="utility"
          onClick={() =>
            setIndex((current) => Math.min(slides.slides.length - 1, current + 1))
          }
          disabled={isLast}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </dialog>
  )
}
