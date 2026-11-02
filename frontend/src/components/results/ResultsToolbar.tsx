import { Download, Printer } from 'lucide-react'
import { Button } from '../ui/Button'
import { downloadCsv } from '../../utils/tableExport'
import type { CsvColumn } from '../../utils/tableExport'

type ResultsToolbarProps<TData> = {
  filename: string
  columns: CsvColumn<TData>[]
  rows: TData[]
}

export function ResultsToolbar<TData>({
  filename,
  columns,
  rows,
}: ResultsToolbarProps<TData>) {
  const hasRows = rows.length > 0

  return (
    <div className="flex flex-wrap items-center gap-xs print:hidden">
      <Button
        variant="secondary"
        onClick={() => downloadCsv(filename, columns, rows)}
        disabled={!hasRows}
      >
        <Download className="size-4" aria-hidden="true" />
        Export CSV
      </Button>
      <Button
        variant="utility"
        onClick={() => window.print()}
        disabled={!hasRows}
      >
        <Printer className="size-4" aria-hidden="true" />
        Print / PDF
      </Button>
    </div>
  )
}
