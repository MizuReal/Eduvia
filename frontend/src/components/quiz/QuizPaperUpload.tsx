import { useEffect, useId, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { FileRejection } from 'react-dropzone'
import {
  Download,
  Eye,
  FileUp,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import {
  PROGRESS_ANNOUNCEMENT_STEP,
  formatFileSize,
} from '../../config/content'
import {
  QUIZ_PAPER_ACCEPT,
  QUIZ_PAPER_ACCEPT_LABEL,
  QUIZ_PAPER_MAX_BYTES,
} from '../../config/quiz'
import { ApiError } from '../../services/apiClient'
import {
  removeQuizPaper,
  uploadQuizPaper,
} from '../../services/quizService'
import { getFileUrl } from '../../services/topicContentService'
import type { Quiz, QuizFile } from '../../types/quiz'
import { FormAlert } from '../auth/FormAlert'
import { ConfirmDeleteDialog } from '../teacher/ConfirmDeleteDialog'
import { Button } from '../ui/Button'
import { openSignedUrl } from '../content/openSignedUrl'
import { QuizPaperPreviewDialog } from './QuizPaperPreviewDialog'

type QuizPaperUploadProps = {
  quizId: string
  accessToken: string
  file: QuizFile | null
  onUpdated: (quiz: Quiz) => void
}

function rejectionMessage(rejections: FileRejection[]): string {
  const first = rejections[0]?.errors[0]

  if (first?.code === 'file-too-large') {
    return `That file is larger than ${formatFileSize(QUIZ_PAPER_MAX_BYTES)}.`
  }

  if (first?.code === 'file-invalid-type') {
    return 'Use a PDF or DOCX file.'
  }

  return 'That file could not be added. Try another file.'
}

export function QuizPaperUpload({
  quizId,
  accessToken,
  file,
  onUpdated,
}: QuizPaperUploadProps) {
  const hintId = useId()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isReplacing, setIsReplacing] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortController?.abort()
    }
  }, [abortController])

  const onDrop = (accepted: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      setUploadError(rejectionMessage(rejections))
      return
    }

    const nextFile = accepted[0]

    if (!nextFile) {
      return
    }

    setSelectedFile(nextFile)
    setUploadError(null)
    setProgress(0)
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: QUIZ_PAPER_ACCEPT,
    maxSize: QUIZ_PAPER_MAX_BYTES,
    multiple: false,
    disabled: isUploading,
    onDrop,
  })

  const upload = async () => {
    if (!selectedFile) {
      setUploadError('Choose a quiz paper to upload.')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setProgress(0)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const updated = await uploadQuizPaper(
        quizId,
        selectedFile,
        accessToken,
        {
          signal: controller.signal,
          onProgress: setProgress,
        },
      )

      onUpdated(updated)
      setSelectedFile(null)
      setIsReplacing(false)
    } catch (error) {
      setUploadError(
        error instanceof ApiError && error.code === 'UPLOAD_CANCELLED'
          ? 'Upload cancelled. You can try again.'
          : error instanceof ApiError
            ? error.message
            : 'We could not upload that quiz paper. Try again.',
      )
    } finally {
      setIsUploading(false)
      setAbortController(null)
    }
  }

  const cancelUpload = () => {
    abortController?.abort()
  }

  const download = async () => {
    if (!file) {
      return
    }

    setDownloadError(null)

    try {
      const signed = await getFileUrl(file.id, accessToken)
      openSignedUrl(signed.url)
    } catch (error) {
      setDownloadError(
        error instanceof ApiError
          ? error.message
          : 'We could not open the quiz paper. Try again.',
      )
    }
  }

  const showUploader = !file || isReplacing

  if (!showUploader && file) {
    return (
      <>
        <div className="rounded-lg border border-hairline bg-surface p-sm">
          <div className="flex flex-wrap items-center gap-sm">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-canvas-soft">
              <FileUp className="size-5 text-ink-secondary" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-medium text-ink">
                {file.originalName}
              </p>
              <p className="mt-xxs text-caption text-ink-muted">
                {formatFileSize(file.sizeBytes)} · uploaded paper
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-xxs">
              <Button
                variant="utility"
                onClick={() => setIsPreviewOpen(true)}
              >
                <Eye className="size-4" aria-hidden="true" />
                Preview
              </Button>
              <Button variant="utility" onClick={() => void download()}>
                <Download className="size-4" aria-hidden="true" />
                Download
              </Button>
              <Button
                variant="utility"
                onClick={() => {
                  setIsReplacing(true)
                  setSelectedFile(null)
                  setUploadError(null)
                }}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Replace
              </Button>
              <Button variant="utility" onClick={() => setIsRemoving(true)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Remove
              </Button>
            </div>
          </div>

          {downloadError && (
            <p role="alert" className="mt-sm text-caption text-accent-orange-deep">
              {downloadError}
            </p>
          )}
        </div>

        {isPreviewOpen && (
          <QuizPaperPreviewDialog
            file={file}
            accessToken={accessToken}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}

        {isRemoving && (
          <ConfirmDeleteDialog
            title="Remove quiz paper?"
            description="Remove the uploaded paper from this quiz? The answer key stays."
            onConfirm={async () => {
              const updated = await removeQuizPaper(quizId, accessToken)
              onUpdated(updated)
              setIsRemoving(false)
            }}
            onClose={() => setIsRemoving(false)}
          />
        )}
      </>
    )
  }

  return (
    <div className="rounded-lg border border-hairline bg-surface p-lg">
      <div className="flex items-start justify-between gap-sm">
        <div>
          <h3 className="text-title text-ink">
            {file ? 'Replace quiz paper' : 'Upload quiz paper'}
          </h3>
          <p className="mt-xxs text-body-sm text-ink-muted">
            {QUIZ_PAPER_ACCEPT_LABEL}, up to{' '}
            {formatFileSize(QUIZ_PAPER_MAX_BYTES)}. The paper is shown to
            learners; the answer key is entered below.
          </p>
        </div>
        {file && (
          <Button
            variant="utility"
            onClick={() => {
              setIsReplacing(false)
              setSelectedFile(null)
              setUploadError(null)
            }}
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="mt-md">
        <FormAlert message={uploadError} />
      </div>

      <div
        {...getRootProps({
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Choose a quiz paper file',
          'aria-describedby': hintId,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              open()
            }
          },
        })}
        className={clsx(
          'mt-sm flex min-h-32 cursor-pointer flex-col items-center justify-center gap-xs rounded-lg border border-dashed px-md py-lg text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          isDragActive
            ? 'border-primary bg-canvas-soft'
            : 'border-hairline bg-canvas-soft hover:border-primary/60',
          isUploading && 'cursor-not-allowed opacity-60',
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="size-8 text-ink-faint" aria-hidden="true" />
        <p className="text-body-sm font-medium text-ink">
          {isDragActive
            ? 'Drop the quiz paper here'
            : 'Drag and drop, or press Enter to choose a file'}
        </p>
        <p id={hintId} className="text-caption text-ink-muted">
          {QUIZ_PAPER_ACCEPT_LABEL} · up to{' '}
          {formatFileSize(QUIZ_PAPER_MAX_BYTES)}
        </p>
      </div>

      {selectedFile && (
        <div className="mt-sm flex items-center gap-sm rounded-md border border-hairline bg-surface px-sm py-xs">
          <FileUp className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm text-ink">
              {selectedFile.name}
            </p>
            <p className="text-caption text-ink-muted">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null)
              setProgress(0)
            }}
            disabled={isUploading}
            aria-label="Remove selected quiz paper"
            className="inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {isUploading && (
        <div className="mt-sm">
          <div className="flex items-center justify-between gap-sm text-body-sm text-ink-secondary">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Quiz paper upload progress"
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

      <div className="mt-md flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
        {isUploading ? (
          <Button variant="utility" onClick={cancelUpload}>
            Cancel upload
          </Button>
        ) : null}
        <Button
          variant="primary"
          onClick={() => void upload()}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-4" aria-hidden="true" />
          )}
          {isUploading ? 'Uploading…' : 'Upload paper'}
        </Button>
      </div>
    </div>
  )
}
