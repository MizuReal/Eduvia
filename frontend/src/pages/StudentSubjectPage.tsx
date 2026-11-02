import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  CircleAlert,
  RefreshCw,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { StudentAccessGate } from '../components/student/StudentAccessGate'
import { Button } from '../components/ui/Button'
import { courseTermLabel, yearLevelLabel } from '../config/course'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import { getStudentSubject } from '../services/enrollmentService'
import type { StudentSubjectWorkspace } from '../types/enrollment'
import type { AuthMode } from '../types/auth'

type StudentSubjectPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function SubjectSkeleton() {
  return (
    <div className="mt-xl" aria-busy="true">
      <div className="h-24 max-w-2xl animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="mt-md h-96 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading subject</span>
    </div>
  )
}

function SubjectError({
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

function SubjectContent({ subject }: { subject: StudentSubjectWorkspace }) {
  return (
    <>
      <div className="mt-md max-w-3xl">
        <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
          {subject.code}
        </span>
        <h1 className="mt-md text-heading-2 sm:text-heading-1">
          {subject.name}
        </h1>
        <p className="mt-sm text-body-md text-ink-muted">
          {courseTermLabel(subject.term)} · {yearLevelLabel(subject.yearLevel)}{' '}
          · @{subject.instructorUsername}
        </p>
      </div>

      <section aria-labelledby="subject-topics-heading" className="mt-xl">
        <div className="flex items-center justify-between gap-md">
          <h2 id="subject-topics-heading" className="text-heading-3">
            Topics and lessons
          </h2>
          <span className="rounded-full border border-hairline bg-surface px-xs py-xxs text-eyebrow text-ink-muted">
            {subject.topics.length}
          </span>
        </div>

        {subject.topics.length === 0 ? (
          <div className="mt-md rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
            <BookOpen
              className="mx-auto size-8 text-ink-faint"
              aria-hidden="true"
            />
            <p className="mt-sm text-body-sm text-ink-muted">
              Your teacher has not added topics yet.
            </p>
          </div>
        ) : (
          <ol className="mt-md space-y-md">
            {subject.topics.map((topic, index) => (
              <li
                key={topic.id}
                className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
              >
                <div className="flex items-start gap-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-body-sm font-medium text-ink-secondary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-title text-ink">{topic.title}</h3>
                    <p className="mt-xxs text-caption text-ink-muted">
                      {topic.lessons.length}{' '}
                      {topic.lessons.length === 1 ? 'lesson' : 'lessons'}
                    </p>
                    {topic.lessons.length > 0 && (
                      <ol className="mt-sm space-y-xs border-l border-hairline pl-sm">
                        {topic.lessons.map((lesson) => (
                          <li key={lesson.id} className="text-body-sm text-ink">
                            {lesson.title}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}

export function StudentSubjectPage({ onOpenAuth }: StudentSubjectPageProps) {
  const { courseId } = useParams<{ courseId: string }>()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [subject, setSubject] = useState<StudentSubjectWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    if (!courseId || !accessToken) {
      setSubject(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)

    try {
      setSubject(await getStudentSubject(courseId, accessToken))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setNotFound(true)
        return
      }

      setLoadError('We could not load this subject. Try again.')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, courseId])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  return (
    <section className="py-xl lg:py-section">
      <Container>
        <Link
          to="/student"
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          My subjects
        </Link>

        <StudentAccessGate onOpenAuth={onOpenAuth}>
          {isLoading && <SubjectSkeleton />}
          {!isLoading && notFound && (
            <div className="mt-xl max-w-card rounded-lg border border-hairline bg-surface p-lg shadow-soft">
              <CircleAlert
                className="size-5 text-accent-orange-deep"
                aria-hidden="true"
              />
              <h2 className="mt-sm text-heading-3">Subject not available</h2>
              <p className="mt-xxs text-body-sm text-ink-muted">
                This subject does not exist or you are not enrolled in it.
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
            <SubjectError
              message={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {!isLoading && !notFound && !loadError && subject && (
            <SubjectContent subject={subject} />
          )}
        </StudentAccessGate>
      </Container>
    </section>
  )
}
