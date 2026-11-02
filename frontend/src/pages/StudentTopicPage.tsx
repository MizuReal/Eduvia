import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileText,
  Presentation,
  RefreshCw,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { StudentAccessGate } from '../components/student/StudentAccessGate'
import { Button } from '../components/ui/Button'
import { TopicAssetProvider } from '../components/content/TopicAssetProvider'
import { TiptapRenderer } from '../components/content/TiptapRenderer'
import { openSignedUrl } from '../components/content/openSignedUrl'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import { getStudentTopicContent } from '../services/studentContentService'
import type { AuthMode } from '../types/auth'
import type {
  SlidesContentItem,
  StudentPresentationContentItem,
  StudentTopicContent,
  TopicAsset,
} from '../types/topicContent'

type StudentTopicPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

type Source = 'upload' | 'slides'

function TopicSkeleton() {
  return (
    <div className="mt-xl" aria-busy="true">
      <div className="h-24 max-w-2xl animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="mt-md h-[60vh] animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading topic slides</span>
    </div>
  )
}

function TopicError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="mt-xl max-w-card rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
    >
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <p className="mt-xs text-body-sm text-ink">{message}</p>
      <Button variant="utility" onClick={onRetry} className="mt-sm">
        <RefreshCw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}

function SlideNavigation({
  index,
  total,
  label,
  onChange,
}: {
  index: number
  total: number
  label: string
  onChange: (nextIndex: number) => void
}) {
  return (
    <div className="mt-sm flex flex-wrap items-center justify-between gap-sm">
      <p className="text-caption text-ink-muted" aria-live="polite">
        {label} {index + 1} of {total}
      </p>
      <div className="flex items-center gap-xs">
        <Button
          variant="utility"
          onClick={() => onChange(index - 1)}
          disabled={index === 0}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="utility"
          onClick={() => onChange(index + 1)}
          disabled={index >= total - 1}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

function UploadedPresentationViewer({
  upload,
}: {
  upload: StudentPresentationContentItem
}) {
  const [index, setIndex] = useState(0)
  const previews = upload.previews
  const effectiveIndex = Math.min(index, Math.max(0, previews.length - 1))

  useEffect(() => {
    setIndex((current) =>
      Math.min(current, Math.max(0, previews.length - 1)),
    )
  }, [previews.length])

  const preview = previews[effectiveIndex]
  const isPdf = upload.file.mimeType === 'application/pdf'

  return (
    <section
      aria-labelledby="uploaded-presentation-heading"
      className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <div className="flex items-start gap-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-canvas-soft">
          <Presentation
            className="size-5 text-ink-secondary"
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="uploaded-presentation-heading"
            className="text-title text-ink"
          >
            {upload.title}
          </h2>
          <p className="mt-xxs text-caption text-ink-muted">
            {upload.file.originalName} · Uploaded presentation
          </p>
        </div>
      </div>

      <p className="mt-sm whitespace-pre-line text-body-sm text-ink-secondary">
        {upload.summary}
      </p>

      <div className="mt-md bg-canvas-soft p-md">
        {preview ? (
          <img
            src={preview.url}
            alt={`Slide ${effectiveIndex + 1} of ${previews.length}`}
            className="mx-auto max-h-[65vh] w-auto max-w-full rounded-md border border-hairline bg-surface object-contain"
          />
        ) : isPdf ? (
          <iframe
            title={`${upload.title} PDF presentation`}
            src={upload.file.url}
            className="h-[65vh] w-full rounded-md border border-hairline bg-surface"
          />
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-sm rounded-md border border-hairline bg-surface p-lg text-center">
            <FileText
              className="size-8 text-ink-faint"
              aria-hidden="true"
            />
            <p className="text-body-sm text-ink-muted">
              This presentation does not have a slide preview yet. You can
              download the original file.
            </p>
            <Button
              variant="primary"
              onClick={() => openSignedUrl(upload.file.url)}
            >
              <Download className="size-4" aria-hidden="true" />
              Download presentation
            </Button>
          </div>
        )}
      </div>

      {previews.length > 1 && (
        <SlideNavigation
          index={effectiveIndex}
          total={previews.length}
          label="Slide"
          onChange={(nextIndex) =>
            setIndex(Math.min(Math.max(0, nextIndex), previews.length - 1))
          }
        />
      )}
    </section>
  )
}

function TiptapSlidesViewer({
  slides,
  refreshAsset,
}: {
  slides: SlidesContentItem
  refreshAsset: (fileId: string) => Promise<TopicAsset | null>
}) {
  const [index, setIndex] = useState(0)
  const slidesList = slides.content.slides
  const effectiveIndex = Math.min(index, Math.max(0, slidesList.length - 1))

  useEffect(() => {
    setIndex((current) =>
      Math.min(current, Math.max(0, slidesList.length - 1)),
    )
  }, [slidesList.length])

  const slide = slidesList[effectiveIndex]

  return (
    <section
      aria-labelledby="created-slides-heading"
      className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <div className="flex items-start gap-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-canvas-soft">
          <BookOpen className="size-5 text-ink-secondary" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="created-slides-heading" className="text-title text-ink">
            Created slides
          </h2>
          <p className="mt-xxs text-caption text-ink-muted">
            {slides.title} · {slidesList.length}{' '}
            {slidesList.length === 1 ? 'slide' : 'slides'}
          </p>
        </div>
      </div>

      <div className="mt-md bg-canvas-soft p-md">
        {slide ? (
          <div className="mx-auto aspect-video w-full max-w-4xl overflow-y-auto rounded-lg border border-hairline bg-surface p-lg shadow-soft sm:p-xl">
            <TopicAssetProvider
              assets={slides.assets}
              refreshAsset={refreshAsset}
            >
              <TiptapRenderer
                key={slide.id}
                content={slide.content}
                variant="slide"
                label={`Slide ${effectiveIndex + 1} content`}
              />
            </TopicAssetProvider>
          </div>
        ) : (
          <p className="text-center text-body-sm text-ink-muted">
            This topic has no slides yet.
          </p>
        )}
      </div>

      {slidesList.length > 1 && (
        <SlideNavigation
          index={effectiveIndex}
          total={slidesList.length}
          label="Slide"
          onChange={(nextIndex) =>
            setIndex(Math.min(Math.max(0, nextIndex), slidesList.length - 1))
          }
        />
      )}
    </section>
  )
}

export function StudentTopicPage({ onOpenAuth }: StudentTopicPageProps) {
  const { courseId, topicId } = useParams<{
    courseId: string
    topicId: string
  }>()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [content, setContent] = useState<StudentTopicContent | null>(null)
  const [activeSource, setActiveSource] = useState<Source>('upload')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const fetchContent = useCallback(async (): Promise<StudentTopicContent | null> => {
    if (!topicId || !accessToken) {
      return null
    }

    return getStudentTopicContent(topicId, accessToken)
  }, [accessToken, topicId])

  const load = useCallback(async () => {
    if (!courseId || !topicId || !accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)

    try {
      const next = await fetchContent()

      if (!next || next.topic.courseId !== courseId) {
        setNotFound(true)
        return
      }

      setContent(next)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setNotFound(true)
        return
      }

      setLoadError('We could not load this topic. Try again.')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, courseId, fetchContent, topicId])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  useEffect(() => {
    const handleFocus = () => {
      void fetchContent()
        .then((next) => {
          if (next && next.topic.courseId === courseId) {
            setContent(next)
          }
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 404) {
            setContent(null)
            setNotFound(true)
          }
        })
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [courseId, fetchContent])

  const refreshAsset = useCallback(
    async (fileId: string) => {
      try {
        const next = await fetchContent()

        if (!next) {
          return null
        }

        setContent(next)

        return next.slides?.assets.find((asset) => asset.id === fileId) ?? null
      } catch {
        return null
      }
    },
    [fetchContent],
  )

  const sources: Source[] = []
  if (content?.upload) {
    sources.push('upload')
  }
  if (content?.slides) {
    sources.push('slides')
  }
  const currentSource = sources.includes(activeSource)
    ? activeSource
    : (sources[0] ?? 'upload')

  return (
    <section className="py-xl lg:py-section">
      <Container>
        <Link
          to={`/student/subjects/${courseId}`}
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to subject
        </Link>

        <StudentAccessGate onOpenAuth={onOpenAuth}>
          {content && (
            <div className="mt-md max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
                Topic slides
              </span>
              <h1 className="mt-md text-heading-2 sm:text-heading-1">
                {content.topic.title}
              </h1>
            </div>
          )}

          {isLoading && <TopicSkeleton />}
          {!isLoading && notFound && (
            <div className="mt-xl max-w-card rounded-lg border border-hairline bg-surface p-lg shadow-soft">
              <CircleAlert
                className="size-5 text-accent-orange-deep"
                aria-hidden="true"
              />
              <h2 className="mt-sm text-heading-3">Topic not available</h2>
              <p className="mt-xxs text-body-sm text-ink-muted">
                This topic does not exist or you are not enrolled in its
                subject.
              </p>
              <Button
                variant="utility"
                className="mt-md"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Try again
              </Button>
            </div>
          )}
          {!isLoading && !notFound && loadError && (
            <TopicError
              message={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {!isLoading && !notFound && !loadError && content && (
            <>
              {sources.length > 1 && (
                <div
                  role="group"
                  aria-label="Presentation source"
                  className="mt-md flex flex-wrap gap-xs"
                >
                  <Button
                    variant={currentSource === 'upload' ? 'primary' : 'utility'}
                    aria-pressed={currentSource === 'upload'}
                    onClick={() => setActiveSource('upload')}
                  >
                    Uploaded presentation
                  </Button>
                  <Button
                    variant={currentSource === 'slides' ? 'primary' : 'utility'}
                    aria-pressed={currentSource === 'slides'}
                    onClick={() => setActiveSource('slides')}
                  >
                    Created slides
                  </Button>
                </div>
              )}

              <div className="mt-md">
                {sources.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
                    <Presentation
                      className="mx-auto size-8 text-ink-faint"
                      aria-hidden="true"
                    />
                    <h2 className="mt-sm text-title text-ink">
                      No slides for this topic
                    </h2>
                    <p className="mt-xxs text-body-sm text-ink-muted">
                      Your teacher has not added a presentation or created
                      slides yet.
                    </p>
                  </div>
                ) : currentSource === 'upload' && content.upload ? (
                  <UploadedPresentationViewer upload={content.upload} />
                ) : content.slides ? (
                  <TiptapSlidesViewer
                    slides={content.slides}
                    refreshAsset={refreshAsset}
                  />
                ) : null}
              </div>
            </>
          )}
        </StudentAccessGate>
      </Container>
    </section>
  )
}
