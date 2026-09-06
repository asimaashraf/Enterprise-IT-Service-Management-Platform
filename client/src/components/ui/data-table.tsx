import * as React from 'react'
import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

export interface DataTableProps<TData> {
  /** TanStack Table columns definition */
  columns: ColumnDef<TData>[]
  /** Row data */
  data: TData[]
  /** True while data is being fetched */
  loading?: boolean
  /** Total row count for pagination (when server-side pagination is used) */
  totalCount?: number
  /** Initial pagination state */
  pagination?: PaginationState
  /** Called when pagination changes */
  onPaginationChange?: (pagination: PaginationState) => void
  /** Initial sorting state */
  sorting?: SortingState
  /** Called when sorting changes */
  onSortingChange?: (sorting: SortingState) => void
  /** Whether to show the page size selector (default true) */
  showPageSizeOptions?: boolean
  /** Available page sizes (default [10, 20, 50]) */
  pageSizeOptions?: number[]
  /** Text shown when data is empty */
  emptyTitle?: string
  emptyDescription?: string
  /** onRetry callback for error recovery in the empty slot */
  onRetry?: () => void
  className?: string
}

const defaultPageSizes = [10, 20, 50]

function SortIcon({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc' } }) {
  const sorted = column.getIsSorted()
  if (!sorted) return <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground/50" />
  if (sorted === 'asc') return <ArrowUp className="ml-2 h-3.5 w-3.5 text-primary" />
  return <ArrowDown className="ml-2 h-3.5 w-3.5 text-primary" />
}

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  totalCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  showPageSizeOptions = true,
  pageSizeOptions = defaultPageSizes,
  emptyTitle,
  emptyDescription,
  onRetry,
  className,
}: DataTableProps<TData>) {
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: pagination?.pageIndex ?? 0,
    pageSize: pagination?.pageSize ?? 10,
  })

  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    sorting ?? [],
  )

  const pageIndex = pagination?.pageIndex ?? internalPagination.pageIndex
  const pageSize = pagination?.pageSize ?? internalPagination.pageSize

  const table = useReactTable({
    data,
    columns,
    pageCount: totalCount !== undefined ? Math.ceil(totalCount / pageSize) : -1,
    state: {
      pagination:
        pagination !== undefined
          ? pagination
          : { pageIndex, pageSize },
      sorting:
        sorting !== undefined
          ? sorting
          : internalSorting,
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize })
          : updater
      if (onPaginationChange) {
        onPaginationChange(next)
      } else {
        setInternalPagination(next)
      }
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater(internalSorting)
          : updater
      if (onSortingChange) {
        onSortingChange(next)
      } else {
        setInternalSorting(next)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: totalCount !== undefined,
    manualSorting: sorting !== undefined,
  })

  const pageCount = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'bg-muted/30',
                        canSort && 'cursor-pointer select-none hover:bg-muted/50',
                      )}
                      onClick={
                        canSort ? header.column.getToggleSortingHandler() : undefined
                      }
                    >
                      <div className="flex items-center">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {canSort && (
                          <SortIcon column={header.column} />
                        )}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: pageSize }).map((_, idx) => (
                <TableRow key={idx}>
                  {columns.map((_, cIdx) => (
                    <TableCell key={cIdx}>
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center"
                >
                  <EmptyState
                    title={emptyTitle ?? 'No data'}
                    description={
                      emptyDescription ?? 'There are no records to display.'
                    }
                    onRetry={onRetry}
                    preset="inbox"
                  />
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {totalCount !== undefined ? (
              <>
                Showing{' '}
                <span className="font-medium">{pageIndex * pageSize + 1}</span>
                {' '}–{' '}
                <span className="font-medium">
                  {Math.min((pageIndex + 1) * pageSize, totalCount)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{totalCount.toLocaleString()}</span>
                {' '}results
              </>
            ) : (
              <>
                <span className="font-medium">{data.length}</span> rows
              </>
            )}
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="flex items-center gap-1 px-2 text-sm text-muted-foreground">
              Page{' '}
              <span className="font-medium text-foreground">
                {currentPage + 1}
              </span>
              {' '}of{' '}
              <span className="font-medium text-foreground">{pageCount}</span>
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          {showPageSizeOptions && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <select
                className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={pageSize}
                onChange={(e) =>
                  table.setPageSize(Number(e.target.value))
                }
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
