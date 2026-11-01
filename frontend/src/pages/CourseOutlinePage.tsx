import { ArrowLeft, CircleAlert, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { LessonForm } from '../components/teacher/LessonForm'
import { TableOfContents } from '../components/teacher/TableOfContents'
import { TeacherAccessGate } from '../components/teacher/TeacherAccessGate'
import { TopicForm } from '../components/teacher/TopicForm'
import { Button } from '../components/ui/Button'
import { courseTermLabel, yearLevelLabel } from '../config/course'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import {
  createLesson,
  createTopic,
  getCourseOutline,
} from '../services/courseOutlineService'
import type { AuthMode } from '../types/auth'
import type {
  CourseOutline,
  CourseTopic,
  CreateLessonInput,
  CreateTopicInput,
  Lesson,
} from '../types/courseOutline'

type CourseOutlinePageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function OutlineSkeleton() {
  return (
    <div className="mt-xl" aria-busy="true">
      <div className="grid gap-lg md:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      </div>
      <div className="mt-lg h-64 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading subject outline</span>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mt-xl max-w-xl rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <h2 className="mt-sm text-heading-3">Subject not found</h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        This subject does not exist or is not available to your account.
      </p>
      <Link
        to="/teacher"
        className="mt-md inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-primary transition-colors hover:text-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Back to subjects
      </Link>
    </div>
  )
}

function OutlineError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="mt-xl max-w-xl rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
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

export function CourseOutlinePage({ onOpenAuth }: CourseOutlinePageProps) {
  const { courseId } = useParams<{ courseId: string }>()
  const { session } = useAuth()
  const [outline, setOutline] = useState<CourseOutline | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const accessToken = session?.access_token

  useEffect(() => {
    if (!courseId || !accessToken) {
      setOutline(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)

    void getCourseOutline(courseId, accessToken)
      .then((nextOutline) => {
        if (!cancelled) {
          setOutline(nextOutline)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        if (
          error instanceof ApiError &&
          (error.code === 'COURSE_NOT_FOUND' || error.status === 404)
        ) {
          setNotFound(true)
          setOutline(null)
          return
        }

        setLoadError('We could not load this subject. Try again.')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, courseId, reloadKey])

  const handleCreateTopic = useCallback(
    async (input: CreateTopicInput): Promise<CourseTopic> => {
      if (!courseId || !accessToken) {
        throw new ApiError(
          'AUTH_REQUIRED',
          'Sign in again to add a topic.',
          401,
        )
      }

      const topic = await createTopic(courseId, input, accessToken)

      setOutline((current) =>
        current ? { ...current, topics: [...current.topics, topic] } : current,
      )

      return topic
    },
    [accessToken, courseId],
  )

  const handleCreateLesson = useCallback(
    async (input: CreateLessonInput): Promise<Lesson> => {
      if (!courseId || !accessToken) {
        throw new ApiError(
          'AUTH_REQUIRED',
          'Sign in again to add a lesson.',
          401,
        )
      }

      const lesson = await createLesson(courseId, input, accessToken)

      setOutline((current) =>
        current
          ? {
              ...current,
              topics: current.topics.map((topic) =>
                topic.id === input.topicId
                  ? { ...topic, lessons: [...topic.lessons, lesson] }
                  : topic,
              ),
            }
          : current,
      )

      return lesson
    },
    [accessToken, courseId],
  )

  const handleRetry = () => {
    setReloadKey((key) => key + 1)
  }

  return (
    <section
      aria-labelledby="course-outline-heading"
      className="py-xl lg:py-section"
    >
      <Container>
        <Link
          to="/teacher"
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All subjects
        </Link>

        <div className="mt-md max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
            {outline?.code ?? 'Subject outline'}
          </span>
          <h1
            id="course-outline-heading"
            className="mt-md text-heading-2 sm:text-heading-1"
          >
            {outline?.name ?? 'Subject outline'}
          </h1>
          {outline && (
            <p className="mt-sm text-body-md text-ink-muted">
              {courseTermLabel(outline.term)} ·{' '}
              {yearLevelLabel(outline.yearLevel)}
            </p>
          )}
        </div>

        <TeacherAccessGate onOpenAuth={onOpenAuth}>
          {isLoading && <OutlineSkeleton />}
          {!isLoading && notFound && <NotFound />}
          {!isLoading && !notFound && loadError && (
            <OutlineError message={loadError} onRetry={handleRetry} />
          )}
          {!isLoading && !notFound && !loadError && outline && (
            <>
              <div className="mt-xl grid gap-lg md:grid-cols-2">
                <TopicForm onCreate={handleCreateTopic} />
                <LessonForm
                  topics={outline.topics}
                  onCreate={handleCreateLesson}
                />
              </div>
              <TableOfContents topics={outline.topics} />
            </>
          )}
        </TeacherAccessGate>
      </Container>
    </section>
  )
}
