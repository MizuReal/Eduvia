import { useEffect, useId, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { FileRejection } from 'react-dropzone'
import { FileUp, Loader2, UploadCloud, X } from 'lucide-react'
import clsx from 'clsx'
import {
  ALT_TEXT_MAX_LENGTH,
  DOCUMENT_ACCEPT,
  DOCUMENT_ACCEPT_LABEL,
  DOCUMENT_MAX_BYTES,
  IMAGE_ACCEPT,
  IMAGE_ACCEPT_LABEL,
  IMAGE_MAX_BYTES,
  PROGRESS_ANNOUNCEMENT_STEP,
  formatFileSize,
} from '../../config/content'
import { altTextSchema } from '../../schemas/topicContent'
import { ApiError } from '../../services/apiClient'
import { uploadContentAsset } from '../../services/topicContentService'
import type { AssetUploadKind, TopicAsset } from '../../types/topicContent'
import { FormAlert } from '../auth/FormAlert'
import { FieldError } from '../auth/FieldError'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import {
  DIALOG_ACTIONS_CLASSES,
  DIALOG_CLASSES,
} from '../teacher/dialogStyles'
import { Button } from '../ui/Button'

type UploadPhase = 'idle' | 'uploading' | 'processing' | 'error' | 'cancelled'

type InsertAssetDialogProps = {
  kind: AssetUploadKind
  contentId: string
  accessToken: string
  onClose: () => void
  onInserted: (asset: TopicAsset, alt: string) => void
}

function defaultAltText(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 250)
}

function rejectionMessage(rejections: FileRejection[]): string {
  const first = rejections[0]?.errors[0]

  if (first?.code === 'file-too-large') {
    return 'That file is larger than the allowed limit.'
  }

  if (first?.code === 'file-invalid-type') {
    return 'That file type is not supported here.'
  }

  return 'That file could not be added. Try another file.'
}

export function InsertAssetDialog({
  kind,
  contentId,
  accessToken,
  onClose,
  onInserted,
}: InsertAssetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const titleId = useId()
  const hintId = useId()
  const altId = useId()
  const altErrorId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [altError, setAltError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Mount-only: the dialog only renders while an asset is being inserted.
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    // Mount-only: abort an in-flight asset upload when the dialog unmounts.
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const isBusy = phase === 'uploading' || phase === 'processing'
  const maxBytes = kind === 'image' ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES
  const accept = kind === 'image' ? IMAGE_ACCEPT : DOCUMENT_ACCEPT
  const acceptLabel =
    kind === 'image' ? IMAGE_ACCEPT_LABEL : DOCUMENT_ACCEPT_LABEL

  const onDrop = (accepted: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      setUploadError(rejectionMessage(rejections))
      return
    }

    const nextFile = accepted[0]

    if (!nextFile) {
      return
    }

    setFile(nextFile)
    setUploadError(null)
    setPhase('idle')
    setProgress(0)

    if (kind === 'image' && alt.trim().length === 0) {
      setAlt(defaultAltText(nextFile.name))
    }
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept,
    maxSize: maxBytes,
    multiple: false,
    disabled: isBusy,
    onDrop,
  })

  const submit = async () => {
    if (!file) {
      setUploadError('Choose a file to insert.')
      return
    }

    if (kind === 'image') {
      const parsed = altTextSchema.safeParse(alt)

      if (!parsed.success) {
        setAltError(parsed.error.issues[0]?.message ?? 'Use valid alt text.')
        return
      }
    }

    setAltError(null)
    setUploadError(null)
    setPhase('uploading')
    setProgress(0)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const asset = await uploadContentAsset(
        contentId,
        { kind, file },
        accessToken,
        {
          signal: controller.signal,
          onProgress: (percent) => {
            setProgress(percent)
            setPhase(percent >= 100 ? 'processing' : 'uploading')
          },
        },
      )

      onInserted(asset, alt.trim())
    } catch (error) {
      if (error instanceof ApiError && error.code === 'UPLOAD_CANCELLED') {
        setPhase('cancelled')
        setUploadError('Upload cancelled. You can try again.')
        return
      }

      setPhase('error')
      setUploadError(
        error instanceof ApiError
          ? error.message
          : 'We could not upload that file. Try again.',
      )
    } finally {
      abortRef.current = null
    }
  }

  const handleClose = () => {
    if (isBusy) {
      abortRef.current?.abort()
      return
    }

    onClose()
  }

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={DIALOG_CLASSES}
      onCancel={(event) => {
        event.preventDefault()
        handleClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          handleClose()
        }
      }}
    >
      <div className="p-lg">
        <h2 id={titleId} className="text-heading-3">
          {kind === 'image' ? 'Insert image' : 'Attach file'}
        </h2>
        <p className="mt-xxs text-body-sm text-ink-muted">
          {kind === 'image'
            ? 'Add an image to this content.'
            : 'Add a downloadable file to this content.'}
        </p>

        <form
          noValidate
          aria-busy={isBusy}
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          className="mt-md space-y-md"
        >
          <FormAlert message={uploadError} />

          <div>
            <div
              {...getRootProps({
                role: 'button',
                tabIndex: 0,
                'aria-label': `Choose ${kind === 'image' ? 'an image' : 'a file'}`,
                'aria-describedby': hintId,
                onKeyDown: (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    open()
                  }
                },
              })}
              className={clsx(
                'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-xs rounded-lg border border-dashed px-md py-lg text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                isDragActive
                  ? 'border-primary bg-canvas-soft'
                  : 'border-hairline bg-canvas-soft hover:border-primary/60',
                isBusy && 'cursor-not-allowed opacity-60',
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud
                className="size-8 text-ink-faint"
                aria-hidden="true"
              />
              <p className="text-body-sm font-medium text-ink">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag and drop, or press Enter to choose a file'}
              </p>
              <p id={hintId} className="text-caption text-ink-muted">
                {acceptLabel} · up to {formatFileSize(maxBytes)}
              </p>
            </div>

            {file && (
              <div className="mt-sm flex items-center gap-sm rounded-md border border-hairline bg-surface px-sm py-xs">
                <FileUp
                  className="size-4 shrink-0 text-ink-muted"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm text-ink">{file.name}</p>
                  <p className="text-caption text-ink-muted">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setPhase('idle')
                    setProgress(0)
                  }}
                  disabled={isBusy}
                  aria-label="Remove selected file"
                  className="inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {kind === 'image' && (
            <div>
              <label htmlFor={altId} className={FIELD_LABEL_CLASSES}>
                Alt text
              </label>
              <input
                id={altId}
                type="text"
                value={alt}
                maxLength={ALT_TEXT_MAX_LENGTH}
                disabled={isBusy}
                aria-invalid={Boolean(altError)}
                aria-describedby={altError ? altErrorId : undefined}
                className={FIELD_INPUT_CLASSES}
                placeholder="Describe the image"
                onChange={(event) => {
                  setAlt(event.target.value)
                  setAltError(null)
                }}
              />
              <p className={FIELD_HINT_CLASSES}>
                Describe the image for screen readers. Leave it blank if the
                image is decorative.
              </p>
              <FieldError id={altErrorId} message={altError ?? undefined} />
            </div>
          )}

          {isBusy && (
            <div>
              <div className="flex items-center justify-between gap-sm text-body-sm text-ink-secondary">
                <span>
                  {phase === 'processing' ? 'Processing…' : 'Uploading…'}
                </span>
                <span>{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="mt-xxs h-2 overflow-hidden rounded-full bg-canvas-soft"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150 motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="sr-only" aria-live="polite">
                Uploading{' '}
                {Math.floor(progress / PROGRESS_ANNOUNCEMENT_STEP) *
                  PROGRESS_ANNOUNCEMENT_STEP}
                %
              </p>
            </div>
          )}

          <div className={DIALOG_ACTIONS_CLASSES}>
            <Button variant="utility" onClick={handleClose}>
              {isBusy ? 'Cancel upload' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!file || isBusy}
            >
              {isBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {phase === 'processing' ? 'Processing…' : 'Uploading…'}
                </>
              ) : phase === 'error' || phase === 'cancelled' ? (
                'Try again'
              ) : (
                'Upload and insert'
              )}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
