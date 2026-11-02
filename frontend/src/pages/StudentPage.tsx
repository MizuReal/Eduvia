import { useCallback, useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  ArrowRight,
  BookOpen,
  CircleAlert,
  Clock3,
  GraduationCap,
  KeyRound,
  RefreshCw,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { FieldError } from '../components/auth/FieldError'
import { FIELD_INPUT_CLASSES } from '../components/auth/formStyles'
import { StudentAccessGate } from '../components/student/StudentAccessGate'
import { Button } from '../components/ui/Button'
import {
  CLASS_CODE_LENGTH,
  CLASS_CODE_PATTERN,
  courseTermLabel,
  yearLevelLabel,
} from '../config/course'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import {
  getStudentDashboard,
  lookupClassCode,
} from '../services/enrollmentService'
import type { StudentDashboard, StudentEnrollment } from '../types/enrollment'
import type { AuthMode } from '../types/auth'

type StudentPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function PageHeading() {
  return (
    <div className="max-w-2xl">
      <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
        Student workspace
      </span>
      <h1
        id="student-heading"
        className="mt-md text-heading-2 sm:text-heading-1"
      >
        My subjects
      </h1>
      <p className="mt-sm text-body-md text-ink-muted">
        Open your enrolled subjects and follow their topics and lessons. Use a
        class code or the invite link from your teacher to join another subject.
      </p>
    </div>
  )
}

function JoinWithCodeCard({ accessToken }: { accessToken: string }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CLASS_CODE_LENGTH)

    setCode(next)
    setError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const normalized = code.trim().toUpperCase()

    if (!CLASS_CODE_PATTERN.test(normalized)) {
      setError(`Enter the ${CLASS_CODE_LENGTH}-character class code.`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await lookupClassCode(normalized, accessToken)
      navigate(`/student/enroll/${result.courseId}`)
    } catch (error) {
      setError(
        error instanceof ApiError && error.code === 'CLASS_CODE_NOT_FOUND'
          ? 'No subject matches that class code. Check the code and try again.'
          : error instanceof ApiError
            ? error.message
            : 'We could not look up that class code. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="join-code-heading"
      className="mt-lg rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <div className="flex items-start gap-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-sky text-ink">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="join-code-heading" className="text-title text-ink">
            Join with a class code
          </h2>
          <p className="mt-xxs text-body-sm text-ink-muted">
            Enter the {CLASS_CODE_LENGTH}-character code your teacher shared.
          </p>
        </div>
      </div>

      <form
        noValidate
        onSubmit={submit}
        className="mt-md flex flex-col items-start gap-sm sm:flex-row"
      >
        <div className="w-full min-w-0 flex-1">
          <label htmlFor="class-code" className="sr-only">
            Class code
          </label>
          <input
            id="class-code"
            name="classCode"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={CLASS_CODE_LENGTH}
            placeholder="ABC123"
            value={code}
            onChange={handleCodeChange}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? 'class-code-hint class-code-error' : 'class-code-hint'
            }
            className={`${FIELD_INPUT_CLASSES} uppercase tracking-widest`}
          />
          <p id="class-code-hint" className="mt-xxs text-caption text-ink-muted">
            Ask your teacher for the code if you do not have one.
          </p>
          <FieldError id="class-code-error" message={error ?? undefined} />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || code.length === 0}
          className="shrink-0"
        >
          {isSubmitting ? 'Checking…' : 'Continue'}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </section>
  )
}

function SubjectSkeleton() {
  return (
    <div className="mt-md grid gap-md sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="h-44 animate-pulse rounded-lg bg-surface motion-reduce:animate-none"
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Loading your subjects</span>
    </div>
  )
}

function SubjectCard({ enrollment }: { enrollment: StudentEnrollment }) {
  return (
    <li className="rounded-lg border border-hairline bg-surface p-md">
      <div className="flex items-start justify-between gap-sm">
        <span className="rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink-secondary">
          {enrollment.course.code}
        </span>
        <BookOpen className="size-5 shrink-0 text-ink-faint" aria-hidden="true" />
      </div>
      <h3 className="mt-sm text-title text-ink">{enrollment.course.name}</h3>
      <p className="mt-xxs text-caption text-ink-muted">
        {courseTermLabel(enrollment.course.term)} ·{' '}
        {yearLevelLabel(enrollment.course.yearLevel)} · @
        {enrollment.course.instructorUsername}
      </p>
      <Link
        to={`/student/subjects/${enrollment.course.id}`}
        className="mt-md inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-primary transition-colors hover:text-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`Open ${enrollment.course.name}`}
      >
        Open subject
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  )
}

function PendingCard({ enrollment }: { enrollment: StudentEnrollment }) {
  return (
    <li className="rounded-lg border border-hairline bg-canvas-soft p-md">
      <div className="flex items-start justify-between gap-sm">
        <span className="rounded-full border border-hairline bg-surface px-xs py-xxs text-eyebrow text-ink-secondary">
          {enrollment.course.code}
        </span>
        <Clock3 className="size-5 shrink-0 text-ink-faint" aria-hidden="true" />
      </div>
      <h3 className="mt-sm text-title text-ink">{enrollment.course.name}</h3>
      <p className="mt-xxs text-caption text-ink-muted">
        Waiting for @{enrollment.course.instructorUsername} to approve your
        request.
      </p>
    </li>
  )
}

function DashboardError({
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

function Dashboard({
  dashboard,
  isLoading,
  error,
  onRetry,
}: {
  dashboard: StudentDashboard | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (isLoading) {
    return <SubjectSkeleton />
  }

  if (error) {
    return <DashboardError message={error} onRetry={onRetry} />
  }

  const active = dashboard?.active ?? []
  const pending = dashboard?.pending ?? []

  if (active.length === 0 && pending.length === 0) {
    return (
      <div className="mt-xl rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
        <GraduationCap
          className="mx-auto size-8 text-ink-faint"
          aria-hidden="true"
        />
        <h2 className="mt-sm text-title text-ink">No subjects yet</h2>
        <p className="mt-xxs text-body-sm text-ink-muted">
          Enter your class code above or open the invite link your teacher
          shared to request enrollment.
        </p>
      </div>
    )
  }

  return (
    <>
      {pending.length > 0 && (
        <section aria-labelledby="pending-heading" className="mt-xl">
          <div className="flex items-center justify-between gap-md">
            <h2 id="pending-heading" className="text-heading-3">
              Pending requests
            </h2>
            <span className="rounded-full border border-hairline bg-surface px-xs py-xxs text-eyebrow text-ink-muted">
              {pending.length}
            </span>
          </div>
          <ul className="mt-md grid gap-md sm:grid-cols-2">
            {pending.map((enrollment) => (
              <PendingCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="active-heading" className="mt-xl">
        <div className="flex items-center justify-between gap-md">
          <h2 id="active-heading" className="text-heading-3">
            Enrolled subjects
          </h2>
          <span className="rounded-full border border-hairline bg-surface px-xs py-xxs text-eyebrow text-ink-muted">
            {active.length}
          </span>
        </div>
        {active.length === 0 ? (
          <p className="mt-md rounded-lg border border-hairline bg-surface p-md text-body-sm text-ink-muted">
            Approved subjects will appear here.
          </p>
        ) : (
          <ul className="mt-md grid gap-md sm:grid-cols-2">
            {active.map((enrollment) => (
              <SubjectCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export function StudentPage({ onOpenAuth }: StudentPageProps) {
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    if (!accessToken) {
      setDashboard(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      setDashboard(await getStudentDashboard(accessToken))
    } catch {
      setLoadError('We could not load your subjects. Try again.')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  return (
    <section
      aria-labelledby="student-heading"
      className="py-xl lg:py-section"
    >
      <Container>
        <PageHeading />
        <StudentAccessGate onOpenAuth={onOpenAuth}>
          {accessToken && <JoinWithCodeCard accessToken={accessToken} />}
          <Dashboard
            dashboard={dashboard}
            isLoading={isLoading}
            error={loadError}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </StudentAccessGate>
      </Container>
    </section>
  )
}
