import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useRef, useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useDropzone } from 'react-dropzone'
import type { FileRejection } from 'react-dropzone'
import { FileUp, Loader2, UploadCloud, X } from 'lucide-react'
import clsx from 'clsx'
import {
  CONTENT_TITLE_MAX_LENGTH,
  DOCUMENT_MAX_BYTES,
  PRESENTATION_ACCEPT,
  PRESENTATION_ACCEPT_LABEL,
  PRESENTATION_SUMMARY_MAX_LENGTH,
  PRESENTATION_SUMMARY_MIN_LENGTH,
  PROGRESS_ANNOUNCEMENT_STEP,
  formatFileSize,
} from '../../config/content'
import { presentationFormSchema } from '../../schemas/topicContent'
import type { PresentationFormValues } from '../../schemas/topicContent'
import { ApiError } from '../../services/apiClient'
import { uploadPresentation } from '../../services/topicContentService'
import type { TopicContentItem } from '../../types/topicContent'
import { FormAlert } from '../auth/FormAlert'
import { FieldError } from '../auth/FieldError'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import { Button } from '../ui/Button'

type UploadPhase = 'idle' | 'uploading' | 'processing' | 'error' | 'cancelled'

type PresentationUploadFormProps = {
  topicId: string
  accessToken: string
  heading: string
  description: string
  submitLabel: string
  initialTitle?: string
  initialSummary?: string
  onUploaded: (item: TopicContentItem) => void
  onCancel?: () => void
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CONTENT_TITLE_MAX_LENGTH)
}

function rejectionMessage(rejections: FileRejection[]): string {
  const first = rejections[0]?.errors[0]

  if (first?.code === 'file-too-large') {
    return `That presentation is larger than ${formatFileSize(DOCUMENT_MAX_BYTES)}.`
  }

  if (first?.code === 'file-invalid-type') {
    return 'Use a PPTX or PDF presentation.'
  }

  return 'That file could not be added. Try another presentation.'
}

export function PresentationUploadForm({
  topicId,
  accessToken,
  heading,
  description,
  submitLabel,
  initialTitle = '',
  initialSummary = '',
  onUploaded,
  onCancel,
}: PresentationUploadFormProps) {
  const headingId = useId()
  const titleInputId = useId()
  const titleErrorId = useId()
  const summaryId = useId()
  const summaryHintId = useId()
  const summaryErrorId = useId()
  const hintId = useId()
  const lastDerivedTitleRef = useRef('')
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [progress, setProgress] = useState(0)
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PresentationFormValues>({
    resolver: zodResolver(presentationFormSchema),
    defaultValues: { title: initialTitle, summary: initialSummary },
  })

  const isBusy =
    isSubmitting || phase === 'uploading' || phase === 'processing'
  const summaryValue = useWatch({ control, name: 'summary' })
  const summaryLength = (summaryValue ?? '').length

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

    setFile(nextFile)
    setUploadError(null)
    setPhase('idle')
    setProgress(0)

    const currentTitle = getValues('title').trim()
    const derivedTitle = titleFromFilename(nextFile.name)

    if (!currentTitle || currentTitle === lastDerivedTitleRef.current) {
      lastDerivedTitleRef.current = derivedTitle
      setValue('title', derivedTitle, {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
  }

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open,
  } = useDropzone({
    accept: PRESENTATION_ACCEPT,
    maxSize: DOCUMENT_MAX_BYTES,
    multiple: false,
    disabled: isBusy,
    onDrop,
  })

  const submit = handleSubmit(async (values) => {
    if (!file) {
      setUploadError('Choose a presentation to upload.')
      return
    }

    setUploadError(null)
    setPhase('uploading')
    setProgress(0)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const item = await uploadPresentation(
        topicId,
        { file, title: values.title, summary: values.summary },
        accessToken,
        {
          signal: controller.signal,
          onProgress: (percent) => {
            setProgress(percent)
            setPhase(percent >= 100 ? 'processing' : 'uploading')
          },
        },
      )

      onUploaded(item)
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
          : 'We could not upload that presentation. Try again.',
      )
    } finally {
      setAbortController(null)
    }
  })

  const handleCancel = () => {
    if (isBusy) {
      abortController?.abort()
      return
    }

    onCancel?.()
  }

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <h2 id={headingId} className="text-heading-3">
        {heading}
      </h2>
      <p className="mt-xxs text-body-sm text-ink-muted">{description}</p>

      <form
        noValidate
        aria-busy={isBusy}
        onSubmit={submit}
        className="mt-md space-y-md"
      >
        <FormAlert message={uploadError} />

        <div>
          <div
            {...getRootProps({
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Choose a presentation file',
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
                ? 'Drop the presentation here'
                : 'Drag and drop, or press Enter to choose a file'}
            </p>
            <p id={hintId} className="text-caption text-ink-muted">
              {PRESENTATION_ACCEPT_LABEL} · up to{' '}
              {formatFileSize(DOCUMENT_MAX_BYTES)}
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
                aria-label="Remove selected presentation"
                className="inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor={titleInputId} className={FIELD_LABEL_CLASSES}>
            Title
          </label>
          <input
            id={titleInputId}
            type="text"
            maxLength={CONTENT_TITLE_MAX_LENGTH}
            disabled={isBusy}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? titleErrorId : undefined}
            className={FIELD_INPUT_CLASSES}
            {...register('title')}
          />
          <FieldError id={titleErrorId} message={errors.title?.message} />
        </div>

        <div>
          <label htmlFor={summaryId} className={FIELD_LABEL_CLASSES}>
            Summary
          </label>
          <textarea
            id={summaryId}
            rows={5}
            maxLength={PRESENTATION_SUMMARY_MAX_LENGTH}
            disabled={isBusy}
            aria-invalid={Boolean(errors.summary)}
            aria-describedby={
              errors.summary
                ? `${summaryHintId} ${summaryErrorId}`
                : summaryHintId
            }
            className={FIELD_INPUT_CLASSES}
            {...register('summary')}
          />
          <div className="flex items-start justify-between gap-sm">
            <p id={summaryHintId} className={FIELD_HINT_CLASSES}>
              Required, {PRESENTATION_SUMMARY_MIN_LENGTH}–
              {PRESENTATION_SUMMARY_MAX_LENGTH} characters. Learners see this
              before opening the file.
            </p>
            <p className="mt-xxs shrink-0 text-caption text-ink-muted">
              {summaryLength}/{PRESENTATION_SUMMARY_MAX_LENGTH}
            </p>
          </div>
          <FieldError id={summaryErrorId} message={errors.summary?.message} />
        </div>

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

        <div className="flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
          {onCancel && (
            <Button variant="utility" onClick={handleCancel}>
              {isBusy ? 'Cancel upload' : 'Cancel'}
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={!file || isBusy}>
            {isBusy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {phase === 'processing' ? 'Processing…' : 'Uploading…'}
              </>
            ) : phase === 'error' || phase === 'cancelled' ? (
              'Try again'
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </section>
  )
}
