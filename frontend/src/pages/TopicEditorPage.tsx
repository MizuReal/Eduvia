import {
  ArrowLeft,
  CircleAlert,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { TeacherAccessGate } from '../components/teacher/TeacherAccessGate'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/content/ConfirmDialog'
import { DocsEditorPanel } from '../components/content/DocsEditorPanel'
import { SlidesEditorPanel } from '../components/content/SlidesEditorPanel'
import { TopicTabs } from '../components/content/TopicTabs'
import type { TopicTab } from '../components/content/TopicTabs'
import { UploadPanel } from '../components/content/UploadPanel'
import { QuizEditorPanel } from '../components/quiz/QuizEditorPanel'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import {
  ensureContent,
  getTopicWorkspace,
} from '../services/topicContentService'
import type { AuthMode } from '../types/auth'
import type {
  DocContentItem,
  PresentationContentItem,
  SlidesContentItem,
  TopicWorkspace,
} from '../types/topicContent'

type TopicEditorPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function parseTab(value: string | null): TopicTab {
  if (value === 'docs' || value === 'upload' || value === 'quiz') {
    return value
  }

  return 'pptx'
}

function EditorSkeleton() {
  return (
    <div className="mt-xl" aria-busy="true">
      <div className="h-14 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="mt-md h-96 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading topic editor</span>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mt-xl max-w-card rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <h2 className="mt-sm text-heading-3">Topic not found</h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        This topic does not exist or is not available to your account.
      </p>
    </div>
  )
}

function LoadError({
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

export function TopicEditorPage({ onOpenAuth }: TopicEditorPageProps) {
  const { courseId, topicId } = useParams<{
    courseId: string
    topicId: string
  }>()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = parseTab(searchParams.get('tab'))
  const [workspace, setWorkspace] = useState<TopicWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [slidesDirty, setSlidesDirty] = useState(false)
  const [docsDirty, setDocsDirty] = useState(false)
  const [quizDirty, setQuizDirty] = useState(false)
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)

  useEffect(() => {
    if (!topicId || !accessToken) {
      setWorkspace(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)

    const load = async () => {
      let nextWorkspace = await getTopicWorkspace(topicId, accessToken)

      if (cancelled) {
        return
      }

      if (courseId && nextWorkspace.topic.courseId !== courseId) {
        setNotFound(true)
        return
      }

      if (!nextWorkspace.slides || !nextWorkspace.doc) {
        const [slides, doc] = await Promise.all([
          nextWorkspace.slides ??
            ensureContent(topicId, 'slides', accessToken),
          nextWorkspace.doc ?? ensureContent(topicId, 'doc', accessToken),
        ])

        if (cancelled) {
          return
        }

        nextWorkspace = {
          ...nextWorkspace,
          slides:
            slides.kind === 'slides'
              ? (slides as SlidesContentItem)
              : nextWorkspace.slides,
          doc:
            doc.kind === 'doc'
              ? (doc as DocContentItem)
              : nextWorkspace.doc,
        }
      }

      setWorkspace(nextWorkspace)
    }

    void load()
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        if (
          error instanceof ApiError &&
          (error.code === 'TOPIC_NOT_FOUND' || error.status === 404)
        ) {
          setNotFound(true)
          return
        }

        setLoadError('We could not load this topic editor. Try again.')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, courseId, reloadKey, topicId])

  const isDirty = slidesDirty || docsDirty || quizDirty

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  const handleTabChange = (tab: TopicTab) => {
    setSearchParams(tab === 'pptx' ? {} : { tab })
  }

  const handleSlidesSaved = useCallback((item: SlidesContentItem) => {
    setWorkspace((current) =>
      current ? { ...current, slides: item } : current,
    )
  }, [])

  const handleDocsSaved = useCallback((item: DocContentItem) => {
    setWorkspace((current) => (current ? { ...current, doc: item } : current))
  }, [])

  const handleUploadChanged = useCallback(
    (item: PresentationContentItem | null) => {
      setWorkspace((current) =>
        current ? { ...current, upload: item } : current,
      )
    },
    [],
  )

  const handleSlidesDirty = useCallback((dirty: boolean) => {
    setSlidesDirty(dirty)
  }, [])

  const handleDocsDirty = useCallback((dirty: boolean) => {
    setDocsDirty(dirty)
  }, [])

  const handleQuizDirty = useCallback((dirty: boolean) => {
    setQuizDirty(dirty)
  }, [])

  const backHref = `/teacher/subjects/${courseId}`

  const handleBack = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isDirty) {
      return
    }

    event.preventDefault()
    setIsDiscardOpen(true)
  }

  return (
    <section
      aria-labelledby="topic-editor-heading"
      className="py-xl lg:py-section"
    >
      <Container>
        <Link
          to={backHref}
          onClick={handleBack}
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to subject outline
        </Link>

        <div className="mt-md max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
            Topic editor
          </span>
          <h1
            id="topic-editor-heading"
            className="mt-md text-heading-2 sm:text-heading-1"
          >
            {workspace?.topic.title ?? 'Topic editor'}
          </h1>
        </div>

        <TeacherAccessGate onOpenAuth={onOpenAuth}>
          {isLoading && <EditorSkeleton />}
          {!isLoading && notFound && <NotFound />}
          {!isLoading && !notFound && loadError && (
            <LoadError
              message={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {!isLoading && !notFound && !loadError && workspace && accessToken && (
            <>
              <TopicTabs activeTab={activeTab} onChange={handleTabChange} />

              {workspace.slides && (
                <div
                  role="tabpanel"
                  id="topic-panel-pptx"
                  aria-labelledby="topic-tab-pptx"
                  hidden={activeTab !== 'pptx'}
                  className="mt-md"
                >
                  <SlidesEditorPanel
                    item={workspace.slides}
                    accessToken={accessToken}
                    isActive={activeTab === 'pptx'}
                    onSaved={handleSlidesSaved}
                    onDirtyChange={handleSlidesDirty}
                  />
                </div>
              )}

              {workspace.doc && (
                <div
                  role="tabpanel"
                  id="topic-panel-docs"
                  aria-labelledby="topic-tab-docs"
                  hidden={activeTab !== 'docs'}
                  className="mt-md"
                >
                  <DocsEditorPanel
                    item={workspace.doc}
                    accessToken={accessToken}
                    isActive={activeTab === 'docs'}
                    onSaved={handleDocsSaved}
                    onDirtyChange={handleDocsDirty}
                  />
                </div>
              )}

              <div
                role="tabpanel"
                id="topic-panel-upload"
                aria-labelledby="topic-tab-upload"
                hidden={activeTab !== 'upload'}
                className="mt-md"
              >
                <UploadPanel
                  topicId={workspace.topic.id}
                  accessToken={accessToken}
                  upload={workspace.upload}
                  onChanged={handleUploadChanged}
                />
              </div>

              <div
                role="tabpanel"
                id="topic-panel-quiz"
                aria-labelledby="topic-tab-quiz"
                hidden={activeTab !== 'quiz'}
                className="mt-md"
              >
                <QuizEditorPanel
                  key={workspace.topic.id}
                  topicId={workspace.topic.id}
                  accessToken={accessToken}
                  isActive={activeTab === 'quiz'}
                  onDirtyChange={handleQuizDirty}
                />
              </div>
            </>
          )}
        </TeacherAccessGate>

        {isDiscardOpen && (
          <ConfirmDialog
            title="Discard changes?"
            description="Your unsaved slides, document, or quiz changes will be lost."
            confirmLabel="Discard"
            danger
            onConfirm={() => {
              setIsDiscardOpen(false)
              navigate(backHref)
            }}
            onClose={() => setIsDiscardOpen(false)}
          />
        )}
      </Container>
    </section>
  )
}
