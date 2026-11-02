export type CsvColumn<T> = {
  header: string
  value: (row: T) => string | number | null | undefined
}

const CSV_MIME_TYPE = 'text/csv;charset=utf-8;'
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/
const FILENAME_MAX_LENGTH = 80
const UNSAFE_FILENAME_PATTERN = /[^a-z0-9]+/g
const TRIM_HYPHEN_PATTERN = /^-+|-+$/g

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    return String(value)
  }

  const guarded = FORMULA_PREFIX_PATTERN.test(value.trimStart())
    ? `'${value}`
    : value

  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }

  return guarded
}

export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((column) => escapeCsvValue(column.header))
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.value(row))),
  )

  return [header, ...body].map((cells) => cells.join(',')).join('\r\n')
}

export function toFileSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(UNSAFE_FILENAME_PATTERN, '-')
    .replace(TRIM_HYPHEN_PATTERN, '')
    .slice(0, FILENAME_MAX_LENGTH)
    .replace(TRIM_HYPHEN_PATTERN, '')

  return slug || 'results'
}

export function toDateSlug(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const csv = buildCsv(columns, rows)
  const blob = new Blob([`\uFEFF${csv}`], { type: CSV_MIME_TYPE })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  link.rel = 'noopener'

  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
