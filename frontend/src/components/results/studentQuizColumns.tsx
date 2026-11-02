import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { ResultStatusBadge } from './ResultStatusBadge'
import { RESULT_STATUS_LABELS } from './resultStatusLabels'
import type { CsvColumn } from '../../utils/tableExport'
import type { StudentQuizResultRow } from '../../types/quizResults'

export const STUDENT_QUIZ_DEFAULT_SORTING: SortingState = [
  { id: 'percentage', desc: true },
]

function formatSubmittedAt(value: string | null): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const STUDENT_QUIZ_COLUMNS: ColumnDef<StudentQuizResultRow>[] = [
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

export const STUDENT_QUIZ_CSV_COLUMNS: CsvColumn<StudentQuizResultRow>[] = [
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
