import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { ArrowLeft, ClipboardCheck, FilePenLine, Gauge, ListChecks, Trophy, Users } from 'lucide-react'
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
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import { getTopicQuizResults } from '../services/quizResultsService'
import { toDateSlug, toFileSlug } from '../utils/tableExport'
import type { CsvColumn } from '../utils/tableExport'
import type { AuthMode } from '../types/auth'
import type { TopicQuizResultRow, TopicQuizResults } from '../types/quizResults'

const DEFAULT_SORTING: SortingState = [{ id: 'lastName', desc: false }]
const EMPTY_ROWS: TopicQuizResultRow[] = []

type QuizResultsPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function compareStudentNames(
  left: { original: TopicQuizResultRow },
  right: { original: TopicQuizResultRow },
): number {
  const leftLastName =
    left.original.lastName || left.original.firstName || left.original.username
  const rightLastName =
    right.original.lastName ||
    right.original.firstName ||
    right.original.username
  const byLastName = leftLastName.localeCompare(rightLastName, undefined, {
    sensitivity: 'base',
  })

  if (byLastName !== 0) {
    return byLastName
  }

  const byFirstName = left.original.firstName.localeCompare(
    right.original.firstName,
    undefined,
    { sensitivity: 'base' },
  )

  if (byFirstName !== 0) {
    return byFirstName
  }

  return left.original.username.localeCompare(
    right.original.username,
    undefined,
    { sensitivity: 'base' },
  )
}

function studentName(row: TopicQuizResultRow): string | null {
  if (!row.lastName) {
    return row.firstName || null
  }

  return row.firstName
    ? `${row.lastName}, ${row.firstName}`
    : row.lastName
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

const TOPIC_QUIZ_COLUMNS: ColumnDef<TopicQuizResultRow>[] = [
  {
    id: 'lastName',
    header: 'Student',
    accessorFn: (row) =>
      (row.lastName || row.firstName || row.username).toLowerCase(),
    cell: ({ row }) => {
      const name = studentName(row.original)

      return (
        <div className="min-w-0">
          <span className="block font-medium">
            {name ?? `@${row.original.username}`}
          </span>
          {name && (
            <span className="block text-caption text-ink-muted">
              @{row.original.username}
            </span>
          )}
        </div>
      )
    },
    sortingFn: compareStudentNames,
  },
  {
    id: 'faculty',
    header: 'Faculty',
    accessorFn: (row) => row.faculty,
    cell: ({ row }) => row.original.faculty,
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

const TOPIC_QUIZ_CSV_COLUMNS: CsvColumn<TopicQuizResultRow>[] = [
  { header: 'Last name', value: (row) => row.lastName },
  { header: 'First name', value: (row) => row.firstName },
  { header: 'Username', value: (row) => row.username },
  { header: 'Faculty', value: (row) => row.faculty },
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

export function QuizResultsPage({ onOpenAuth }: QuizResultsPageProps) {
  const { courseId, topicId } = useParams<{
    courseId: string
    topicId: string
  }>()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [results, setResults] = useState<TopicQuizResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)

  useEffect(() => {
    if (!topicId || !accessToken) {
      setResults(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)

    void getTopicQuizResults(topicId, accessToken)
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

        setLoadError('We could not load these quiz results. Try again.')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, reloadKey, topicId])

  const rows = results?.rows ?? EMPTY_ROWS
  const quiz = results?.quiz ?? null
  const submittedCount = rows.filter((row) => row.status !== 'not_taken').length
  const passedCount = rows.filter((row) => row.status === 'passed').length
  const averageScore =
    submittedCount > 0
      ? Math.round(
          rows.reduce((total, row) => total + (row.percentage ?? 0), 0) /
            submittedCount,
        )
      : null
  // TanStack Table owns its sorting models and returns callbacks by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: TOPIC_QUIZ_COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  const sortedRows = table.getRowModel().rows.map((row) => row.original)
  const backHref = courseId ? `/teacher/subjects/${courseId}` : '/teacher'
  const csvFilename = `quiz-results-${toFileSlug(
    results?.topic.title ?? 'topic',
  )}-${toDateSlug()}.csv`

  return (
    <section
      aria-labelledby="quiz-results-heading"
      className="py-xl lg:py-section print:py-0"
    >
      <Container>
        <Link
          to={backHref}
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to subject outline
        </Link>

        <TeacherAccessGate onOpenAuth={onOpenAuth}>
          {isLoading && <ResultsSkeleton label="Loading quiz results" />}
          {!isLoading && notFound && (
            <ResultsNotFound
              title="Topic not found"
              description="This topic does not exist or is not available to your account."
              backHref={backHref}
              backLabel="Back to subject outline"
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
                  id="quiz-results-heading"
                  className="mt-md text-heading-2 sm:text-heading-1"
                >
                  {results.topic.title}
                </h1>
                <p className="mt-sm text-body-md text-ink-muted">
                  {quiz
                    ? `${quiz.title} · Passing score ${quiz.passingScore}%`
                    : 'No quiz created for this topic yet.'}
                </p>
              </div>

              {!quiz && (
                <div className="mt-xl max-w-card rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
                  <ListChecks
                    className="mx-auto size-8 text-ink-faint"
                    aria-hidden="true"
                  />
                  <h2 className="mt-sm text-title text-ink">
                    No quiz for this topic yet
                  </h2>
                  <p className="mt-xxs text-body-sm text-ink-muted">
                    Create a quiz to start collecting student results.
                  </p>
                  {courseId && (
                    <Link
                      to={`/teacher/subjects/${courseId}/topics/${topicId}?tab=quiz`}
                      className={buttonClasses('primary', 'mt-md')}
                    >
                      Make a quiz
                    </Link>
                  )}
                </div>
              )}

              {quiz && quiz.status === 'draft' && (
                <div className="mt-xl max-w-card rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
                  <FilePenLine
                    className="mx-auto size-8 text-ink-faint"
                    aria-hidden="true"
                  />
                  <h2 className="mt-sm text-title text-ink">
                    This quiz is still a draft
                  </h2>
                  <p className="mt-xxs text-body-sm text-ink-muted">
                    Publish it before students can attempt it and results can be
                    collected.
                  </p>
                  {courseId && (
                    <Link
                      to={`/teacher/subjects/${courseId}/topics/${topicId}?tab=quiz`}
                      className={buttonClasses('primary', 'mt-md')}
                    >
                      Open quiz editor
                    </Link>
                  )}
                </div>
              )}

              {quiz && quiz.status === 'published' && (
                <>
                  <div className="mt-lg grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4">
                    <ResultStatCard
                      label="Enrolled"
                      value={String(rows.length)}
                      helper="Active students"
                      icon={Users}
                      tone="sky"
                    />
                    <ResultStatCard
                      label="Submitted"
                      value={String(submittedCount)}
                      helper={`of ${rows.length} enrolled`}
                      icon={ClipboardCheck}
                      tone="orange"
                    />
                    <ResultStatCard
                      label="Passed"
                      value={String(passedCount)}
                      helper={`of ${submittedCount} submitted`}
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
                      columns={TOPIC_QUIZ_CSV_COLUMNS}
                      rows={sortedRows}
                    />
                  </div>
                  <p className="mt-xs max-w-card text-caption text-ink-muted print:hidden">
                    Shows every active student and their best graded attempt,
                    sorted by last name. “Export CSV” opens in Excel or Google
                    Sheets. “Print / PDF” opens your browser’s print dialog,
                    where you can choose Save as PDF.
                  </p>

                  <ResultsTable
                    table={table}
                    caption={`Quiz results for ${results.topic.title}`}
                    ariaLabel="Quiz results table"
                    emptyMessage="No active students have joined this subject yet."
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
