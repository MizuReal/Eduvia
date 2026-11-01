import { useCallback, useEffect, useState } from 'react'
import { Container } from '../components/layout/Container'
import { SubjectForm } from '../components/teacher/SubjectForm'
import { SubjectList } from '../components/teacher/SubjectList'
import { TeacherAccessGate } from '../components/teacher/TeacherAccessGate'
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

export function TeacherPage({ onOpenAuth }: TeacherPageProps) {
  const { status, profile, session } = useAuth()
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
      return created
    },
    [accessToken],
  )

  const handleRetry = () => {
    setReloadKey((key) => key + 1)
  }

  return (
    <section aria-labelledby="teacher-heading" className="py-xl lg:py-section">
      <Container>
        <PageHeading />
        <TeacherAccessGate onOpenAuth={onOpenAuth}>
          <div className="mt-xl grid gap-lg lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <SubjectForm onCreate={handleCreate} />
            <SubjectList
              courses={courses}
              isLoading={isLoading}
              error={loadError}
              onRetry={handleRetry}
            />
          </div>
        </TeacherAccessGate>
      </Container>
    </section>
  )
}
