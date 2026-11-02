import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { flexRender } from '@tanstack/react-table'
import type { Table } from '@tanstack/react-table'

type ResultsTableProps<TData> = {
  table: Table<TData>
  caption: string
  ariaLabel: string
  emptyMessage: string
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') {
    return <ArrowUp className="size-3.5 print:hidden" aria-hidden="true" />
  }

  if (direction === 'desc') {
    return <ArrowDown className="size-3.5 print:hidden" aria-hidden="true" />
  }

  return (
    <ChevronsUpDown
      className="size-3.5 text-ink-faint print:hidden"
      aria-hidden="true"
    />
  )
}

export function ResultsTable<TData>({
  table,
  caption,
  ariaLabel,
  emptyMessage,
}: ResultsTableProps<TData>) {
  const rows = table.getRowModel().rows

  return (
    <div className="mt-lg overflow-hidden rounded-lg border border-hairline bg-surface shadow-soft print:mt-md print:border-0 print:shadow-none">
      <div
        role="region"
        aria-label={ariaLabel}
        // A horizontally scrollable results table must be reachable by keyboard.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary print:overflow-visible"
      >
        <table className="w-full min-w-[720px] border-collapse text-body-sm print:min-w-0">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-canvas-soft">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const direction = header.column.getIsSorted()

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        canSort
                          ? direction === 'asc'
                            ? 'ascending'
                            : direction === 'desc'
                              ? 'descending'
                              : 'none'
                          : undefined
                      }
                      className="border-b border-hairline px-md py-sm text-left text-eyebrow uppercase tracking-wide text-ink-muted"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex min-h-11 items-center gap-xxs rounded-sm text-left uppercase tracking-wide transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <SortIcon direction={direction} />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(table.getVisibleLeafColumns().length, 1)}
                  className="px-md py-xl text-center text-body-sm text-ink-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-hairline last:border-b-0 hover:bg-canvas-soft/60 print:hover:bg-transparent"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-md py-sm align-top text-ink"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
