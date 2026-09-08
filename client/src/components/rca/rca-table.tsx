import { useState } from 'react'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'

// The shared table supports externally paginated data. Slice locally; RCA has
// no server pagination endpoint. Keep the server's ordering across all pages.
export function RCATable<T>({
  data,
  columns,
  loading,
  emptyTitle,
  emptyDescription,
}: {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  emptyTitle: string
  emptyDescription: string
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const pageIndex = Math.min(
    pagination.pageIndex,
    Math.max(0, Math.ceil(data.length / pagination.pageSize) - 1),
  )
  return (
    <DataTable
      data={data.slice(
        pageIndex * pagination.pageSize,
        (pageIndex + 1) * pagination.pageSize,
      )}
      columns={columns.map((column) => ({ ...column, enableSorting: false }))}
      loading={loading}
      totalCount={data.length}
      pagination={{ ...pagination, pageIndex }}
      onPaginationChange={setPagination}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  )
}
