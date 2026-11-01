import { BookOpen, CircleAlert, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Container } from '../components/layout/Container'
import { SubjectForm } from '../components/teacher/SubjectForm'
import { SubjectList } from '../components/teacher/SubjectList'
import { Button } from '../components/ui/Button'
import { ButtonLink } from '../components/ui/ButtonLink'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import {
  createCourse,
  listCourses as listCoursesRequest,
} from '../services/courseService'
import type { AuthMode } from '../types/auth'
import type { Course, CreateCourseInput } from '../types/course'

type TeacherPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function PageHeading() {
  return (
    <div className="max-w-2xl">
      <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
        Teacher workspace
      </span>
      <h1
        id="teacher-heading"
        className="mt-md text-heading-2 sm:text-heading-1"
      >
        Subjects
      </h1>
      <p className="mt-sm text-body-md text-ink-muted">
        Create the subjects you teach and keep them organized by trimester and
        year level.
      </p>
    </div>
  )
}

function TeacherPageSkeleton() {
  return (
    <div
      className="mt-xl grid gap-lg lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"
      aria-busy="true"
    >
      <div className="h-96 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="h-96 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading teacher workspace</span>
    </div>
  )
}

function SignInGate({ onOpenAuth }: TeacherPageProps) {
  return (
    <div className="mt-xl max-w-xl rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent-purple">
        <BookOpen className="size-6 text-ink" aria-hidden="true" />
      </span>
      <h2 className="mt-md text-heading-3">Sign in to manage your subjects</h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        Use your teacher account to create subjects and keep them organized.
      </p>
      <Button
        variant="primary"
        className="mt-md"
        onClick={() => onOpenAuth('login')}
      >
        Sign in
      </Button>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="mt-xl max-w-xl rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <span className="flex size-12 items-center justify-center rounded-lg bg-canvas-soft">
        <ShieldAlert className="size-6 text-ink-secondary" aria-hidden="true" />
      </span>
      <h2 className="mt-md text-heading-3">Teacher access required</h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        This workspace is available to instructor accounts.
      </p>
      <ButtonLink href="/" variant="secondary" className="mt-md">
        Back to home
      </ButtonLink>
    </div>
  )
}

function ProfileError() {
  return (
    <div
      role="alert"
      className="mt-xl flex max-w-xl items-start gap-xs rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
    >
      <CircleAlert
        className="mt-xxs size-5 shrink-0 text-accent-orange-deep"
        aria-hidden="true"
      />
      <div>
        <h2 className="text-heading-3">We could not load your account</h2>
        <p className="mt-xxs text-body-sm text-ink-muted">
          Refresh the page or sign in again.
        </p>
      </div>
    </div>
  )
}

export function TeacherPage({ onOpenAuth }: TeacherPageProps) {
  const { status, profile, profileError, session } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const accessToken = session?.access_token

  useEffect(() => {
    if (
      status !== 'authenticated' ||
      profile?.role !== 'instructor' ||
      !accessToken
    ) {
      setCourses([])
      setLoadError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    void listCoursesRequest(accessToken)
      .then((nextCourses) => {
        if (!cancelled) {
          setCourses(nextCourses)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('We could not load your subjects. Try again.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, profile?.role, reloadKey, status])

  const handleCreate = useCallback(
    async (input: CreateCourseInput) => {
      if (!accessToken) {
        throw new ApiError(
          'AUTH_REQUIRED',
          'Sign in again to create a subject.',
          401,
        )
      }

      const created = await createCourse(input, accessToken)
      setLoadError(null)
      setCourses((current) => [created, ...current])
    },
    [accessToken],
  )

  const handleRetry = () => {
    setReloadKey((key) => key + 1)
  }

  const isProfileLoading =
    status === 'authenticated' && !profile && !profileError
  const isInstructor =
    status === 'authenticated' && profile?.role === 'instructor'

  return (
    <section aria-labelledby="teacher-heading" className="py-xl lg:py-section">
      <Container>
        <PageHeading />

        {status === 'loading' && <TeacherPageSkeleton />}
        {isProfileLoading && <TeacherPageSkeleton />}
        {status === 'anonymous' && <SignInGate onOpenAuth={onOpenAuth} />}
        {status === 'authenticated' && profileError && <ProfileError />}
        {status === 'authenticated' &&
          profile &&
          profile.role !== 'instructor' && <AccessDenied />}

        {isInstructor && (
          <div className="mt-xl grid gap-lg lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <SubjectForm onCreate={handleCreate} />
            <SubjectList
              courses={courses}
              isLoading={isLoading}
              error={loadError}
              onRetry={handleRetry}
            />
          </div>
        )}
      </Container>
    </section>
  )
}
