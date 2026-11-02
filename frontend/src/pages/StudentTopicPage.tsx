import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileText,
  ListChecks,
  Lock,
  Presentation,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { ConfirmDialog } from '../components/content/ConfirmDialog'
import { TopicAssetProvider } from '../components/content/TopicAssetProvider'
import { TiptapRenderer } from '../components/content/TiptapRenderer'
import { openSignedUrl } from '../components/content/openSignedUrl'
import { TopicProgressBar } from '../components/student/ProgressBars'
import { StudentAccessGate } from '../components/student/StudentAccessGate'
import { TopicStatusBadge } from '../components/student/TopicStatusBadge'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import {
  recordSlideProgress,
} from '../services/learningService'
import { getStudentTopicContent } from '../services/studentContentService'
import type { AuthMode } from '../types/auth'
import type {
  SlideSource,
  StudentTopicContent,
} from '../types/learning'
import type {
  SlidesContentItem,
  StudentPresentationContentItem,
  TopicAsset,
} from '../types/topicContent'

type StudentTopicPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

type Source = SlideSource

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
  onChange,
}: {
  index: number
  total: number
  onChange: (nextIndex: number) => void
}) {
  return (
    <div className="mt-sm flex flex-wrap items-center justify-between gap-sm">
      <p className="text-caption text-ink-muted" aria-live="polite">
        Slide {index + 1} of {total}
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
  initialIndex,
  onViewed,
}: {
  upload: StudentPresentationContentItem
  initialIndex: number
  onViewed: (source: SlideSource, index: number, total: number) => void
}) {
  const previews = upload.previews
  const [index, setIndex] = useState(Math.max(0, initialIndex))
  const effectiveIndex = Math.min(index, Math.max(0, previews.length - 1))
  const total = Math.max(1, previews.length)
  const isPdf = upload.file.mimeType === 'application/pdf'

  useEffect(() => {
    setIndex((current) =>
      Math.min(current, Math.max(0, previews.length - 1)),
    )
  }, [previews.length])

  useEffect(() => {
    onViewed('upload', effectiveIndex, total)
  }, [effectiveIndex, onViewed, total])

  const preview = previews[effectiveIndex]

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
  initialIndex,
  refreshAsset,
  onViewed,
}: {
  slides: SlidesContentItem
  initialIndex: number
  refreshAsset: (fileId: string) => Promise<TopicAsset | null>
  onViewed: (source: SlideSource, index: number, total: number) => void
}) {
  const slidesList = slides.content.slides
  const [index, setIndex] = useState(Math.max(0, initialIndex))
  const effectiveIndex = Math.min(index, Math.max(0, slidesList.length - 1))

  useEffect(() => {
    setIndex((current) =>
      Math.min(current, Math.max(0, slidesList.length - 1)),
    )
  }, [slidesList.length])

  useEffect(() => {
    if (slidesList.length > 0) {
      onViewed('slides', effectiveIndex, slidesList.length)
    }
  }, [effectiveIndex, onViewed, slidesList.length])

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
          onChange={(nextIndex) =>
            setIndex(Math.min(Math.max(0, nextIndex), slidesList.length - 1))
          }
        />
      )}
    </section>
  )
}

function SummaryCard({ summary }: { summary: string }) {
  return (
    <section
      aria-labelledby="topic-summary-heading"
      className="mt-md rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <div className="flex items-start gap-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-canvas-soft">
          <FileText className="size-5 text-ink-secondary" aria-hidden="true" />
        </span>
        <div>
          <h2 id="topic-summary-heading" className="text-title text-ink">
            Topic summary
          </h2>
          <p className="mt-sm whitespace-pre-line text-body-sm text-ink-secondary">
            {summary || 'You have reached the end of the slides.'}
          </p>
        </div>
      </div>
    </section>
  )
}

function PassedCard({
  content,
  courseId,
  onRetry,
}: {
  content: StudentTopicContent
  courseId: string
  onRetry: () => void
}) {
  return (
    <section
      aria-labelledby="quiz-passed-heading"
      className="mt-md rounded-lg border border-accent-green/40 bg-canvas-soft p-lg"
    >
      <div className="flex items-start gap-sm">
        <Trophy
          className="mt-xxs size-6 shrink-0 text-accent-green"
          aria-hidden="true"
        />
        <div>
          <h2 id="quiz-passed-heading" className="text-heading-3 text-ink">
            Congratulations!
          </h2>
          <p className="mt-xxs text-body-sm text-ink-secondary">
            You passed {content.quiz?.title ?? 'this quiz'}
            {content.latestAttempt
              ? ` with ${content.latestAttempt.percentage}%`
              : ''}.
          </p>
          <div className="mt-md flex flex-wrap gap-xs">
            {content.nextTopicId && (
              <Link
                to={`/student/subjects/${courseId}/topics/${content.nextTopicId}`}
                className="inline-flex min-h-11 items-center gap-xxs rounded-full bg-primary px-lg py-sm text-button text-on-primary transition-colors hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Next topic
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
            <Button variant="utility" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Reopen topic
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function NotPassedCard({
  content,
  onTryAgain,
}: {
  content: StudentTopicContent
  onTryAgain: () => void
}) {
  return (
    <section
      aria-labelledby="quiz-failed-heading"
      className="mt-md rounded-lg border border-accent-orange-deep/30 bg-canvas-soft p-lg"
    >
      <div className="flex items-start gap-sm">
        <CircleAlert
          className="mt-xxs size-6 shrink-0 text-accent-orange-deep"
          aria-hidden="true"
        />
        <div>
          <h2 id="quiz-failed-heading" className="text-heading-3 text-ink">
            Not passed yet
          </h2>
          <p className="mt-xxs text-body-sm text-ink-secondary">
            You scored {content.latestAttempt?.percentage ?? 0}%. Review the
            slides and summary, then try again.
          </p>
          <Button variant="primary" onClick={onTryAgain} className="mt-md">
            <ListChecks className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    </section>
  )
}

function ReadyForQuizCard({
  content,
  onStart,
}: {
  content: StudentTopicContent
  onStart: () => void
}) {
  return (
    <section
      aria-labelledby="quiz-ready-heading"
      className="mt-md rounded-lg border border-primary/30 bg-canvas-soft p-lg"
    >
      <div className="flex items-start gap-sm">
        <ListChecks
          className="mt-xxs size-6 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div>
          <h2 id="quiz-ready-heading" className="text-heading-3 text-ink">
            Ready for the quiz
          </h2>
          <p className="mt-xxs text-body-sm text-ink-secondary">
            {content.quiz?.title}. {content.quiz?.questionCount ?? 0} questions
            · passing score {content.quiz?.passingScore ?? 0}%.
          </p>
          <Button variant="primary" onClick={onStart} className="mt-md">
            <ListChecks className="size-4" aria-hidden="true" />
            Take quiz
          </Button>
        </div>
      </div>
    </section>
  )
}

function CompletedCard({
  content,
  courseId,
}: {
  content: StudentTopicContent
  courseId: string
}) {
  return (
    <section
      aria-labelledby="topic-completed-heading"
      className="mt-md rounded-lg border border-accent-green/40 bg-canvas-soft p-lg"
    >
      <div className="flex items-start gap-sm">
        <CheckCircle2
          className="mt-xxs size-6 shrink-0 text-accent-green"
          aria-hidden="true"
        />
        <div>
          <h2 id="topic-completed-heading" className="text-heading-3 text-ink">
            Topic complete
          </h2>
          <p className="mt-xxs text-body-sm text-ink-secondary">
            You finished this topic. There is no quiz for it.
          </p>
          {content.nextTopicId && (
            <Link
              to={`/student/subjects/${courseId}/topics/${content.nextTopicId}`}
              className="mt-md inline-flex min-h-11 items-center gap-xxs rounded-full bg-primary px-lg py-sm text-button text-on-primary transition-colors hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Next topic
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

export function StudentTopicPage({ onOpenAuth }: StudentTopicPageProps) {
  const { courseId, topicId } = useParams<{
    courseId: string
    topicId: string
  }>()
  const { session } = useAuth()
  const navigate = useNavigate()
  const accessToken = session?.access_token
  const [content, setContent] = useState<StudentTopicContent | null>(null)
  const [activeSource, setActiveSource] = useState<Source>('upload')
  const [viewed, setViewed] = useState<{
    source: Source
    index: number
    total: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [locked, setLocked] = useState(false)
  const [isQuizConfirmOpen, setIsQuizConfirmOpen] = useState(false)
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
    setLocked(false)

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

      if (error instanceof ApiError && error.code === 'TOPIC_LOCKED') {
        setLocked(true)
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
            setLocked(false)
          }
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.code === 'TOPIC_LOCKED') {
            setContent(null)
            setLocked(true)
          }

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

  const handleViewed = useCallback(
    (source: SlideSource, index: number, total: number) => {
      setViewed({ source, index, total })

      if (!topicId || !accessToken) {
        return
      }

      void recordSlideProgress(topicId, source, index, accessToken)
        .then((progress) => {
          setContent((current) => {
            if (!current) {
              return current
            }

            const nextStatus =
              current.status === 'passed' || current.status === 'not_passed'
                ? current.status
                : progress.completed
                  ? current.quiz
                    ? 'ready'
                    : 'completed'
                  : 'in_progress'

            return { ...current, progress, status: nextStatus }
          })
        })
        .catch(() => undefined)
    },
    [accessToken, topicId],
  )

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
  const currentProgress =
    currentSource === 'upload'
      ? content?.progress.presentationHighestSlideIndex ?? -1
      : content?.progress.slidesHighestSlideIndex ?? -1
  const initialIndex = Math.max(0, currentProgress)
  const progressTotal =
    viewed?.source === currentSource && viewed.total > 0
      ? viewed.total
      : currentSource === 'upload'
        ? Math.max(1, content?.upload?.previews.length ?? 0)
        : content?.slides?.content.slides.length ?? 0
  const progressValue =
    viewed?.source === currentSource
      ? Math.min(viewed.index + 1, progressTotal)
      : Math.min(currentProgress + 1, progressTotal)
  const isComplete =
    Boolean(content?.progress.completed) ||
    content?.status === 'passed' ||
    content?.status === 'completed'
  const quiz = content?.quiz ?? null
  const quizPassed = content?.status === 'passed'
  const quizFailed = content?.status === 'not_passed'
  const courseHref = `/student/subjects/${courseId}`
  const quizHref = `/student/subjects/${courseId}/topics/${topicId}/quiz`

  const startQuiz = () => {
    setIsQuizConfirmOpen(false)
    navigate(quizHref)
  }

  return (
    <section className="py-xl lg:py-section">
      <Container>
        <Link
          to={courseHref}
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
              <div className="mt-md flex flex-wrap items-center gap-xs">
                <h1 className="text-heading-2 sm:text-heading-1">
                  {content.topic.title}
                </h1>
                <TopicStatusBadge status={content.status} />
              </div>
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
          {!isLoading && locked && (
            <div className="mt-xl max-w-card rounded-lg border border-hairline bg-canvas-soft p-lg">
              <Lock
                className="size-5 text-ink-muted"
                aria-hidden="true"
              />
              <h2 className="mt-sm text-heading-3">Topic locked</h2>
              <p className="mt-xxs text-body-sm text-ink-muted">
                Pass the previous topic to unlock this one.
              </p>
              <Link
                to={courseHref}
                className="mt-md inline-flex min-h-11 items-center gap-xxs rounded-full border border-hairline bg-surface px-md text-body-sm font-medium text-ink transition-colors hover:bg-canvas-soft"
              >
                Back to subject
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
          {!isLoading && !notFound && !locked && loadError && (
            <TopicError
              message={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {!isLoading && !notFound && !locked && !loadError && content && (
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

              {progressTotal > 0 && (
                <div className="mt-md">
                  <TopicProgressBar
                    value={progressValue}
                    total={progressTotal}
                    label="Slide progress"
                  />
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
                  <UploadedPresentationViewer
                    upload={content.upload}
                    initialIndex={initialIndex}
                    onViewed={handleViewed}
                  />
                ) : content.slides ? (
                  <TiptapSlidesViewer
                    slides={content.slides}
                    initialIndex={initialIndex}
                    refreshAsset={refreshAsset}
                    onViewed={handleViewed}
                  />
                ) : null}
              </div>

              {!isComplete ? (
                <p className="mt-md flex items-start gap-xxs rounded-md border border-hairline bg-canvas-soft p-sm text-body-sm text-ink-muted">
                  <Lock
                    className="mt-xxs size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Reach the last slide to unlock the summary and quiz.
                </p>
              ) : (
                <>
                  <SummaryCard summary={content.summary} />

                  {quizPassed ? (
                    <PassedCard
                      content={content}
                      courseId={courseId ?? ''}
                      onRetry={() => setReloadKey((key) => key + 1)}
                    />
                  ) : quizFailed ? (
                    <NotPassedCard
                      content={content}
                      onTryAgain={() => setIsQuizConfirmOpen(true)}
                    />
                  ) : quiz ? (
                    <ReadyForQuizCard
                      content={content}
                      onStart={() => setIsQuizConfirmOpen(true)}
                    />
                  ) : (
                    <CompletedCard
                      content={content}
                      courseId={courseId ?? ''}
                    />
                  )}
                </>
              )}
            </>
          )}
        </StudentAccessGate>

        {isQuizConfirmOpen && quiz && (
          <ConfirmDialog
            title="Ready to take the quiz?"
            description={`${quiz.title} has ${quiz.questionCount} questions. You can retry if you do not pass.`}
            confirmLabel={quizFailed ? 'Try again' : 'Start quiz'}
            onConfirm={startQuiz}
            onClose={() => setIsQuizConfirmOpen(false)}
          />
        )}
      </Container>
    </section>
  )
}
