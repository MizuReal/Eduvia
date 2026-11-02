import { describe, expect, it } from 'vitest'
import { buildCsv, toDateSlug, toFileSlug } from '../utils/tableExport'

type Row = {
  name: string
  score: number
  note: string | null
}

const columns = [
  { header: 'Name', value: (row: Row) => row.name },
  { header: 'Score', value: (row: Row) => row.score },
  { header: 'Note', value: (row: Row) => row.note },
]

describe('tableExport', () => {
  it('quotes values that contain commas, quotes, or newlines', () => {
    const csv = buildCsv(columns, [
      {
        name: 'Doe, Jane',
        score: 90,
        note: 'She said "hello"\nthen left',
      },
    ])

    expect(csv).toBe(
      'Name,Score,Note\r\n"Doe, Jane",90,"She said ""hello""\nthen left"',
    )
  })

  it('prefixes formula-like values to prevent spreadsheet injection', () => {
    const csv = buildCsv(columns, [
      { name: '=HYPERLINK("https://example.com")', score: 75, note: null },
      { name: '  @SUM(A1:A2)', score: 60, note: null },
    ])

    expect(csv).toContain(`"'=HYPERLINK(""https://example.com"")"`)
    expect(csv).toContain(`'  @SUM(A1:A2),60,`)
  })

  it('creates safe file slugs and date stamps', () => {
    expect(toFileSlug('HTML & CSS: Quiz Results')).toBe('html-css-quiz-results')
    expect(toFileSlug('***')).toBe('results')
    expect(toDateSlug(new Date('2026-11-02T12:00:00Z'))).toBe('2026-11-02')
  })
})
