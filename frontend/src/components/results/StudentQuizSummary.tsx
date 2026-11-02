import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import {
  BarChart3,
  ClipboardCheck,
  Gauge,
  ListChecks,
  Trophy,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { ResultStatCard } from './ResultStatCard'
import {
  STUDENT_QUIZ_COLUMNS,
  STUDENT_QUIZ_CSV_COLUMNS,
  STUDENT_QUIZ_DEFAULT_SORTING,
} from './studentQuizColumns'
import { ResultsTable } from './ResultsTable'
import { ResultsToolbar } from './ResultsToolbar'
import { ApiError } from '../../services/apiClient'
import { getOwnQuizResults } from '../../services/quizResultsService'
import { toDateSlug, toFileSlug } from '../../utils/tableExport'
import type {
  StudentQuizResultRow,
  StudentQuizResults,
} from '../../types/quizResults'

const EMPTY_ROWS: StudentQuizResultRow[] = []

type StudentQuizSummaryProps = {
  courseId: string
  accessToken: string
  courseName: string
  onReadyChange: (ready: boolean) => void
}

type SummaryStatus = 'idle' | 'loading' | 'ready' | 'error'

export function StudentQuizSummary({
  courseId,
  accessToken,
  courseName,
  onReadyChange,
}: StudentQuizSummaryProps) {
  const [status, setStatus] = useState<SummaryStatus>('idle')
  const [results, setResults] = useState<StudentQuizResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>(
    STUDENT_QUIZ_DEFAULT_SORTING,
  )

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

  useEffect(() => {
    onReadyChange(status === 'ready' && rows.length > 0)
  }, [onReadyChange, rows.length, status])

  const loadSummary = async () => {
    setStatus('loading')
    setError(null)

    try {
      setResults(await getOwnQuizResults(courseId, accessToken))
      setStatus('ready')
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : 'We could not load your quiz summary. Try again.',
      )
      setStatus('error')
    }
  }

  const csvFilename = `quiz-summary-${toFileSlug(
    results?.student.username ?? 'student',
  )}-${toFileSlug(courseName)}-${toDateSlug()}.csv`

  return (
    <section
      aria-labelledby="quiz-summary-heading"
      className="mt-xl rounded-lg border border-hairline bg-surface p-lg shadow-soft print:mt-0 print:border-0 print:shadow-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex items-start gap-sm">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-purple text-ink">
            <BarChart3 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="quiz-summary-heading" className="text-title text-ink">
              Quiz summary
            </h2>
            <p className="mt-xxs text-body-sm text-ink-muted">
              See your best score on each published quiz in this subject.
            </p>
          </div>
        </div>

        {status === 'idle' && (
          <Button variant="secondary" onClick={() => void loadSummary()}>
            <BarChart3 className="size-4" aria-hidden="true" />
            View summary
          </Button>
        )}
      </div>

      {status === 'loading' && (
        <div className="mt-md" aria-busy="true">
          <div className="h-24 animate-pulse rounded-md bg-canvas-soft motion-reduce:animate-none" />
          <div className="mt-sm h-48 animate-pulse rounded-md bg-canvas-soft motion-reduce:animate-none" />
          <span className="sr-only">Loading quiz summary</span>
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="mt-md rounded-md border border-accent-orange-deep/30 bg-canvas-soft p-sm"
        >
          <p className="text-body-sm text-ink">{error}</p>
          <Button
            variant="utility"
            className="mt-sm"
            onClick={() => void loadSummary()}
          >
            Try again
          </Button>
        </div>
      )}

      {status === 'ready' && rows.length === 0 && (
        <p className="mt-md rounded-md border border-hairline bg-canvas-soft p-sm text-body-sm text-ink-muted">
          No published quizzes in this subject yet.
        </p>
      )}

      {status === 'ready' && rows.length > 0 && (
        <>
          <div className="mb-md hidden print:block">
            <h1 className="text-heading-2 text-ink">{courseName}</h1>
            <p className="mt-xxs text-caption text-ink-muted">
              Quiz summary · @{results?.student.username}
            </p>
          </div>

          <dl className="mt-lg grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4 print:mt-0">
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
          </dl>

          <div className="mt-lg print:hidden">
            <ResultsToolbar
              filename={csvFilename}
              columns={STUDENT_QUIZ_CSV_COLUMNS}
              rows={sortedRows}
            />
          </div>
          <p className="mt-xs max-w-card text-caption text-ink-muted print:hidden">
            “Export CSV” opens in Excel or Google Sheets. “Print / PDF” opens
            your browser’s print dialog, where you can choose Save as PDF.
          </p>

          <ResultsTable
            table={table}
            caption={`Quiz summary for ${courseName}`}
            ariaLabel="Student quiz summary table"
            emptyMessage="No quizzes to show."
          />
        </>
      )}
    </section>
  )
}
