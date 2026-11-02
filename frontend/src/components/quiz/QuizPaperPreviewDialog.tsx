import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { QuizFile } from '../../types/quiz'
import { QuizPaperPreview } from './QuizPaperPreview'

const PREVIEW_DIALOG_CLASSES =
  'm-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-xl border border-hairline bg-surface p-0 text-ink shadow-elevated [&::backdrop]:bg-ink/60'

type QuizPaperPreviewDialogProps = {
  file: QuizFile
  accessToken: string
  onClose: () => void
}

export function QuizPaperPreviewDialog({
  file,
  accessToken,
  onClose,
}: QuizPaperPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    // Mount-only: the dialog opens when the component mounts.
    dialogRef.current?.showModal()
  }, [])

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-label="Quiz paper preview"
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
          <p className="text-title text-ink">Quiz paper</p>
          <p className="text-caption text-ink-muted">{file.originalName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz paper preview"
          className="inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="bg-canvas-soft p-md">
        <QuizPaperPreview file={file} accessToken={accessToken} />
      </div>
    </dialog>
  )
}
