import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { ArrowLeft, ClipboardCheck, Gauge, ListChecks, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { ResultStatCard } from '../components/results/ResultStatCard'
import { ResultStatusBadge } from '../components/results/ResultStatusBadge'
import { RESULT_STATUS_LABELS } from '../components/results/resultStatusLabels'
import {
  ResultsLoadError,
  ResultsNotFound,
  ResultsSkeleton,
} from '../components/results/ResultsPageStates'
import { ResultsTable } from '../components/results/ResultsTable'
import { ResultsToolbar } from '../components/results/ResultsToolbar'
import { TeacherAccessGate } from '../components/teacher/TeacherAccessGate'
import { buttonClasses } from '../components/ui/buttonStyles'
import { courseTermLabel } from '../config/course'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import { getStudentQuizResults } from '../services/quizResultsService'
import { toDateSlug, toFileSlug } from '../utils/tableExport'
import type { CsvColumn } from '../utils/tableExport'
import type { AuthMode } from '../types/auth'
import type {
  StudentQuizResultRow,
  StudentQuizResults,
} from '../types/quizResults'

const DEFAULT_SORTING: SortingState = [{ id: 'percentage', desc: true }]
const EMPTY_ROWS: StudentQuizResultRow[] = []

type StudentResultsPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function formatSubmittedAt(value: string | null): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const STUDENT_QUIZ_COLUMNS: ColumnDef<StudentQuizResultRow>[] = [
  {
    id: 'topicTitle',
    header: 'Topic',
    accessorFn: (row) => row.topicTitle.toLowerCase(),
    cell: ({ row }) => row.original.topicTitle,
    sortingFn: (left, right) =>
      left.original.topicTitle.localeCompare(
        right.original.topicTitle,
        undefined,
        { sensitivity: 'base' },
      ),
  },
  {
    id: 'quizTitle',
    header: 'Quiz',
    accessorFn: (row) => row.quizTitle.toLowerCase(),
    cell: ({ row }) => row.original.quizTitle,
  },
  {
    id: 'attempts',
    header: 'Attempts',
    accessorFn: (row) => row.attempts,
    cell: ({ row }) => row.original.attempts,
  },
  {
    id: 'bestScore',
    header: 'Best score',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.bestScore !== null && row.original.maxScore !== null
        ? `${row.original.bestScore}/${row.original.maxScore}`
        : '—',
  },
  {
    id: 'percentage',
    header: 'Score',
    accessorFn: (row) => row.percentage ?? -1,
    cell: ({ row }) =>
      row.original.percentage !== null ? `${row.original.percentage}%` : '—',
  },
  {
    id: 'status',
    header: 'Result',
    enableSorting: false,
    cell: ({ row }) => <ResultStatusBadge status={row.original.status} />,
  },
  {
    id: 'lastSubmittedAt',
    header: 'Last submitted',
    accessorFn: (row) => row.lastSubmittedAt ?? '',
    cell: ({ row }) => formatSubmittedAt(row.original.lastSubmittedAt),
  },
]

const STUDENT_QUIZ_CSV_COLUMNS: CsvColumn<StudentQuizResultRow>[] = [
  { header: 'Topic', value: (row) => row.topicTitle },
  { header: 'Quiz', value: (row) => row.quizTitle },
  { header: 'Attempts', value: (row) => row.attempts },
  {
    header: 'Best score',
    value: (row) =>
      row.bestScore !== null && row.maxScore !== null
        ? `${row.bestScore}/${row.maxScore}`
        : '',
  },
  { header: 'Percentage', value: (row) => row.percentage },
  { header: 'Result', value: (row) => RESULT_STATUS_LABELS[row.status] },
  { header: 'Last submitted (UTC)', value: (row) => row.lastSubmittedAt },
]

export function StudentResultsPage({ onOpenAuth }: StudentResultsPageProps) {
  const { courseId, studentId } = useParams<{
    courseId: string
    studentId: string
  }>()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [results, setResults] = useState<StudentQuizResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)

  useEffect(() => {
    if (!courseId || !studentId || !accessToken) {
      setResults(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)

    void getStudentQuizResults(courseId, studentId, accessToken)
      .then((nextResults) => {
        if (!cancelled) {
          setResults(nextResults)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
          setResults(null)
          return
        }

        setLoadError(
          'We could not load this student’s quiz results. Try again.',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, courseId, reloadKey, studentId])

  const rows = results?.rows ?? EMPTY_ROWS
  const takenCount = rows.filter((row) => row.status !== 'not_taken').length
  const passedCount = rows.filter((row) => row.status === 'passed').length
  const averageScore =
    takenCount > 0
      ? Math.round(
          rows.reduce((total, row) => total + (row.percentage ?? 0), 0) /
            takenCount,
        )
      : null
  // TanStack Table owns its sorting models and returns callbacks by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: STUDENT_QUIZ_COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  const sortedRows = table.getRowModel().rows.map((row) => row.original)
  const backHref = courseId
    ? `/teacher/subjects/${courseId}/students`
    : '/teacher'
  const csvFilename = `quiz-results-${toFileSlug(
    results?.student.username ?? 'student',
  )}-${toFileSlug(results?.course.code ?? 'subject')}-${toDateSlug()}.csv`

  return (
    <section
      aria-labelledby="student-results-heading"
      className="py-xl lg:py-section print:py-0"
    >
      <Container>
        <Link
          to={backHref}
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to students
        </Link>

        <TeacherAccessGate onOpenAuth={onOpenAuth}>
          {isLoading && (
            <ResultsSkeleton label="Loading student quiz results" />
          )}
          {!isLoading && notFound && (
            <ResultsNotFound
              title="Student not found"
              description="This student is not enrolled in the subject or is not available to your account."
              backHref={backHref}
              backLabel="Back to students"
            />
          )}
          {!isLoading && !notFound && loadError && (
            <ResultsLoadError
              message={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {!isLoading && !notFound && !loadError && results && (
            <>
              <div className="mt-md max-w-3xl">
                <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
                  Quiz results
                </span>
                <h1
                  id="student-results-heading"
                  className="mt-md text-heading-2 sm:text-heading-1"
                >
                  {results.student.username}’s quiz results
                </h1>
                <p className="mt-sm text-body-md text-ink-muted">
                  {results.course.name} · {courseTermLabel(results.course.term)}{' '}
                  · {results.course.code}
                </p>
              </div>

              {rows.length === 0 ? (
                <div className="mt-xl max-w-card rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
                  <ListChecks
                    className="mx-auto size-8 text-ink-faint"
                    aria-hidden="true"
                  />
                  <h2 className="mt-sm text-title text-ink">
                    No published quizzes in this subject yet
                  </h2>
                  <p className="mt-xxs text-body-sm text-ink-muted">
                    Publish a topic quiz to start collecting results for this
                    student.
                  </p>
                  {courseId && (
                    <Link
                      to={`/teacher/subjects/${courseId}`}
                      className={buttonClasses('primary', 'mt-md')}
                    >
                      Open subject outline
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-lg grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4">
                    <ResultStatCard
                      label="Quizzes"
                      value={String(rows.length)}
                      helper="Published quizzes"
                      icon={ListChecks}
                      tone="sky"
                    />
                    <ResultStatCard
                      label="Taken"
                      value={String(takenCount)}
                      helper={`of ${rows.length} quizzes`}
                      icon={ClipboardCheck}
                      tone="orange"
                    />
                    <ResultStatCard
                      label="Passed"
                      value={String(passedCount)}
                      helper={`of ${takenCount} taken`}
                      icon={Trophy}
                      tone="green"
                    />
                    <ResultStatCard
                      label="Average score"
                      value={averageScore === null ? '—' : `${averageScore}%`}
                      helper="Best attempt average"
                      icon={Gauge}
                      tone="purple"
                    />
                  </div>

                  <div className="mt-lg print:hidden">
                    <ResultsToolbar
                      filename={csvFilename}
                      columns={STUDENT_QUIZ_CSV_COLUMNS}
                      rows={sortedRows}
                    />
                  </div>
                  <p className="mt-xs max-w-card text-caption text-ink-muted print:hidden">
                    Shows the best graded attempt for every published quiz in
                    this subject. “Export CSV” opens in Excel or Google Sheets.
                    “Print / PDF” opens your browser’s print dialog, where you
                    can choose Save as PDF.
                  </p>

                  <ResultsTable
                    table={table}
                    caption={`Quiz results for ${results.student.username}`}
                    ariaLabel="Student quiz results table"
                    emptyMessage="No quizzes to show."
                  />
                </>
              )}
            </>
          )}
        </TeacherAccessGate>
      </Container>
    </section>
  )
}
