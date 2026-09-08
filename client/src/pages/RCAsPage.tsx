import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Microscope, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { FilterBar, type FilterField } from '@/components/ui/filter-bar'
import { ErrorState } from '@/components/ui/error-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { RCATable } from '@/components/rca/rca-table'
import { RCAFormDialog } from '@/components/rca/rca-form-dialog'
import { useRcas, useCreateRca, useRcaScope } from '@/hooks/useRcas'
import { rcaError } from '@/lib/rcaApi'
import {
  rcaStatuses,
  rcaStatusVariant,
  problemLabel,
  userLabel,
  rcaDate,
  type RCA,
} from '@/types/rca'

const fields: FilterField[] = [
  {
    key: 'search',
    label: 'Search',
    type: 'search',
    placeholder: 'Search RCA ID, Problem, or root cause…',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: rcaStatuses.map((value) => ({ label: value, value })),
  },
]
export function RCAsPage() {
  const scope = useRcaScope()
  return <RCAWorkspace key={scope.key.join(':')} />
}
function RCAWorkspace() {
  const query = useRcas()
  const create = useCreateRca()
  const scope = useRcaScope()
  const navigate = useNavigate()
  const isAdmin = scope.user?.role === 'admin'
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [creating, setCreating] = useState(false)
  const needle = filters.search.trim().toLowerCase()
  const data = (query.data ?? []).filter(
    (rca) =>
      (!filters.status || rca.status === filters.status) &&
      (!needle ||
        [
          rca.rcaId,
          problemLabel(rca.problem),
          rca.rootCause,
          userLabel(rca.identifiedBy),
        ].some((value) => value.toLowerCase().includes(needle))),
  )
  const columns: ColumnDef<RCA>[] = [
    {
      accessorKey: 'rcaId',
      header: 'RCA ID',
      cell: ({ row }) => (
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          to={`/rcas/${row.original._id}`}
        >
          {row.original.rcaId}
        </Link>
      ),
    },
    {
      id: 'problem',
      header: 'Problem',
      cell: ({ row }) => (
        <p className="max-w-56 whitespace-normal">
          {problemLabel(row.original.problem)}
        </p>
      ),
    },
    {
      accessorKey: 'rootCause',
      header: 'Root cause',
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-64 whitespace-normal">
          {row.original.rootCause}
        </p>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={rcaStatusVariant(row.original.status)}>
          {row.original.status}
        </StatusBadge>
      ),
    },
    {
      id: 'identifiedBy',
      header: 'Identified by',
      cell: ({ row }) => userLabel(row.original.identifiedBy),
    },
    {
      id: 'incidents',
      header: 'Incidents',
      cell: ({ row }) =>
        row.original.relatedIncidents?.filter(Boolean).length ?? 0,
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => rcaDate(row.original.updatedAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button asChild size="sm" variant="outline">
          <Link to={`/rcas/${row.original._id}`}>
            {isAdmin && row.original.status !== 'Approved' ? 'Manage' : 'View'}
          </Link>
        </Button>
      ),
    },
  ]
  return (
    <div className="space-y-6">
      <PageHeader
        title="Root Cause Analysis"
        description={
          isAdmin
            ? 'Investigate recurring issues and manage corrective and preventive work.'
            : 'Read investigations and corrective actions for your organization.'
        }
        icon={Microscope}
        breadcrumbs={[{ label: 'Root Cause Analysis' }]}
        actions={
          isAdmin ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create RCA
            </Button>
          ) : undefined
        }
      />
      <FilterBar
        fields={fields}
        values={filters}
        onChange={(key, value) =>
          setFilters((current) => ({ ...current, [key]: value }))
        }
        onReset={() => setFilters({ search: '', status: '' })}
      />
      {query.isError ? (
        <ErrorState
          title="RCAs could not be loaded"
          description={rcaError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <RCATable
          key={`${filters.search}:${filters.status}`}
          data={data}
          columns={columns}
          loading={query.isPending}
          emptyTitle="No RCAs found"
          emptyDescription={
            needle || filters.status
              ? 'Try another search or clear the status filter.'
              : isAdmin
                ? 'Create an RCA for an existing Problem to begin an investigation.'
                : 'No investigations have been recorded for your organization.'
          }
        />
      )}
      {isAdmin && creating && (
        <RCAFormDialog
          onClose={() => setCreating(false)}
          onCreate={async (payload) => {
            const rca = await create.mutateAsync(payload)
            navigate(`/rcas/${rca._id}`)
          }}
          onUpdate={() => Promise.reject(new Error('Select an RCA to edit'))}
        />
      )}
    </div>
  )
}
