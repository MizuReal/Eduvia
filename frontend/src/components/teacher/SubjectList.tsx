import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleAlert,
  GraduationCap,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { courseTermLabel, yearLevelLabel } from '../../config/course'
import type { Course } from '../../types/course'
import { Button } from '../ui/Button'

type SubjectListProps = {
  courses: Course[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

const SKELETON_CARD_COUNT = 4

function SubjectCard({ course }: { course: Course }) {
  return (
    <li className="rounded-lg border border-hairline bg-surface p-md">
      <div className="flex items-start justify-between gap-sm">
        <span className="rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink-secondary">
          {course.code}
        </span>
        <BookOpen
          className="size-5 shrink-0 text-ink-faint"
          aria-hidden="true"
        />
      </div>

      <h3 className="mt-sm text-title text-ink">{course.name}</h3>

      <dl className="mt-sm flex flex-col gap-xxs text-body-sm text-ink-muted">
        <div className="flex items-center gap-xs">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Trimester</dt>
          <dd>{courseTermLabel(course.term)}</dd>
        </div>
        <div className="flex items-center gap-xs">
          <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Year level</dt>
          <dd>{yearLevelLabel(course.yearLevel)}</dd>
        </div>
      </dl>

      <Link
        to={`/teacher/subjects/${course.id}`}
        className="mt-md inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-primary transition-colors hover:text-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`Open outline for ${course.name}`}
      >
        Open outline
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  )
}

function SubjectListSkeleton() {
  return (
    <div className="mt-md grid gap-md sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-lg bg-surface motion-reduce:animate-none"
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Loading subjects</span>
    </div>
  )
}

function SubjectListError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="mt-md rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
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

function SubjectListEmpty() {
  return (
    <div className="mt-md rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
      <BookOpen className="mx-auto size-8 text-ink-faint" aria-hidden="true" />
      <h3 className="mt-sm text-title text-ink">No subjects yet</h3>
      <p className="mt-xxs text-body-sm text-ink-muted">
        Create your first subject using the form.
      </p>
    </div>
  )
}

export function SubjectList({
  courses,
  isLoading,
  error,
  onRetry,
}: SubjectListProps) {
  return (
    <section aria-labelledby="subject-list-heading">
      <div className="flex items-center justify-between gap-md">
        <h2 id="subject-list-heading" className="text-heading-3">
          Your subjects
        </h2>
        {!isLoading && !error && (
          <span className="rounded-full border border-hairline bg-surface px-xs py-xxs text-eyebrow text-ink-muted">
            {courses.length}
          </span>
        )}
      </div>

      {isLoading && <SubjectListSkeleton />}
      {!isLoading && error && (
        <SubjectListError message={error} onRetry={onRetry} />
      )}
      {!isLoading && !error && courses.length === 0 && <SubjectListEmpty />}
      {!isLoading && !error && courses.length > 0 && (
        <ul className="mt-md grid gap-md sm:grid-cols-2">
          {courses.map((course) => (
            <SubjectCard key={course.id} course={course} />
          ))}
        </ul>
      )}
    </section>
  )
}
