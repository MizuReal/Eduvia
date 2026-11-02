import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock3,
  RefreshCw,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { StudentAccessGate } from '../components/student/StudentAccessGate'
import { Button } from '../components/ui/Button'
import { FormAlert } from '../components/auth/FormAlert'
import { courseTermLabel, yearLevelLabel } from '../config/course'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import {
  getEnrollmentJoinPreview,
  requestEnrollment,
} from '../services/enrollmentService'
import type { EnrollmentJoinPreview } from '../types/enrollment'
import type { AuthMode } from '../types/auth'

type StudentEnrollPageProps = {
  onOpenAuth: (mode: AuthMode) => void
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

function JoinCard({
  preview,
  isSubmitting,
  error,
  onJoin,
}: {
  preview: EnrollmentJoinPreview
  isSubmitting: boolean
  error: string | null
  onJoin: () => void
}) {
  const { course, enrollmentOpen, enrollmentMode, status } = preview

  return (
    <div className="mt-xl max-w-card rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <span className="rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink-secondary">
        {course.code}
      </span>
      <h1 className="mt-sm text-heading-2">{course.name}</h1>
      <p className="mt-xxs text-body-sm text-ink-muted">
        {courseTermLabel(course.term)} · {yearLevelLabel(course.yearLevel)} ·
        @{course.instructorUsername}
      </p>

      <div className="mt-md">
        <FormAlert message={error} />
      </div>

      {status === 'active' ? (
        <div className="mt-md">
          <p className="flex items-center gap-xs text-body-sm text-ink">
            <CheckCircle2
              className="size-4 text-accent-green"
              aria-hidden="true"
            />
            You are already enrolled in this subject.
          </p>
          <Link
            to={`/student/subjects/${course.id}`}
            className="mt-sm inline-flex min-h-11 items-center gap-xxs rounded-full bg-primary px-lg py-sm text-button text-on-primary transition-colors hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Open subject
          </Link>
        </div>
      ) : status === 'pending' ? (
        <div className="mt-md">
          <p className="flex items-center gap-xs text-body-sm text-ink">
            <Clock3 className="size-4 text-ink-muted" aria-hidden="true" />
            Your request is waiting for teacher approval.
          </p>
        </div>
      ) : !enrollmentOpen ? (
        <div className="mt-md rounded-md border border-accent-orange-deep/30 bg-canvas-soft p-sm">
          <p className="text-body-sm text-ink">
            Enrollment is currently closed for this subject.
          </p>
        </div>
      ) : (
        <div className="mt-md">
          <p className="text-body-sm text-ink-muted">
            {enrollmentMode === 'auto'
              ? 'You will join immediately.'
              : 'Your teacher will review your request before you can open the subject.'}
          </p>
          {status === 'rejected' || status === 'removed' ? (
            <p className="mt-xs text-caption text-ink-muted">
              You can request to join again.
            </p>
          ) : null}
          <Button
            variant="primary"
            className="mt-md"
            onClick={onJoin}
            disabled={isSubmitting}
          >
            <BookOpen className="size-4" aria-hidden="true" />
            {isSubmitting
              ? 'Sending request…'
              : enrollmentMode === 'auto'
                ? 'Join subject'
                : 'Request to enroll'}
          </Button>
        </div>
      )}
    </div>
  )
}

export function StudentEnrollPage({ onOpenAuth }: StudentEnrollPageProps) {
  const { courseId } = useParams<{ courseId: string }>()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [preview, setPreview] = useState<EnrollmentJoinPreview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    if (!courseId || !accessToken) {
      setPreview(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      setPreview(await getEnrollmentJoinPreview(courseId, accessToken))
    } catch (error) {
      setLoadError(
        error instanceof ApiError && error.status === 404
          ? 'This subject is not available.'
          : 'We could not load this subject. Try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, courseId])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  const join = async () => {
    if (!courseId || !accessToken) {
      return
    }

    setIsSubmitting(true)
    setJoinError(null)

    try {
      setPreview(await requestEnrollment(courseId, accessToken))
    } catch (error) {
      setJoinError(
        error instanceof ApiError
          ? error.message
          : 'We could not enroll you in this subject. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

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
          {isLoading && (
            <div
              className="mt-xl h-80 max-w-card animate-pulse rounded-lg bg-surface motion-reduce:animate-none"
              aria-busy="true"
            >
              <span className="sr-only">Loading subject invitation</span>
            </div>
          )}
          {!isLoading && loadError && (
            <LoadError
              message={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {!isLoading && !loadError && preview && (
            <JoinCard
              preview={preview}
              isSubmitting={isSubmitting}
              error={joinError}
              onJoin={() => void join()}
            />
          )}
        </StudentAccessGate>
      </Container>
    </section>
  )
}
