import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { format } from 'date-fns'

import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { FilterBar, type FilterOption } from '@/components/ui/filter-bar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import { IncidentFormDialog } from '@/components/incidents/incident-form-dialog'
import { IncidentViewDialog } from '@/components/incidents/incident-view-dialog'
import { IncidentEditDialog } from '@/components/incidents/incident-edit-dialog'
import type {
  CreateIncidentFormData,
  UpdateIncidentFormData,
} from '@/components/incidents/incident-form'
import {
  type Incident,
  type IncidentFilters,
  type CreateIncidentPayload,
  type UpdateIncidentPayload,
  getUserDisplay,
  normalizeStatusVariant,
  normalizePriorityVariant,
  normalizeSeverityVariant,
} from '@/types/incident'
import {
  useIncidents,
  useCreateIncident,
  useUpdateIncident,
  useDeleteIncident,
} from '@/hooks/useIncidents'

import type { RootState } from '@/store/store'

const statusOptions: FilterOption[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
]

const priorityOptions: FilterOption[] = [
  { label: 'All Priorities', value: '' },
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Critical', value: 'Critical' },
]

const severityOptions: FilterOption[] = [
  { label: 'All Severities', value: '' },
  { label: 'Minor', value: 'Minor' },
  { label: 'Major', value: 'Major' },
  { label: 'Critical', value: 'Critical' },
]

const filterFields = [
  { key: 'search', type: 'search' as const, label: 'Search', placeholder: 'Search incidents…' },
  { key: 'status', type: 'select' as const, label: 'Status', options: statusOptions, placeholder: 'Status' },
  { key: 'priority', type: 'select' as const, label: 'Priority', options: priorityOptions, placeholder: 'Priority' },
  { key: 'severity', type: 'select' as const, label: 'Severity', options: severityOptions, placeholder: 'Severity' },
]

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return '—'
  }
}

export function IncidentsPage() {
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  // Data
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents()

  // Mutations
  const createMutation = useCreateIncident()
  const updateMutation = useUpdateIncident()
  const deleteMutation = useDeleteIncident()

  // UI state
  const [filters, setFilters] = useState<IncidentFilters>({
    search: '',
    status: '',
    priority: '',
    severity: '',
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState<Incident | null>(null)
  const [editTarget, setEditTarget] = useState<Incident | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null)

  // Filtered data
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matches =
          inc.incidentId.toLowerCase().includes(q) ||
          inc.title.toLowerCase().includes(q) ||
          (inc.description ?? '').toLowerCase().includes(q)
        if (!matches) return false
      }
      if (filters.status && inc.status !== filters.status) return false
      if (filters.priority && inc.priority !== filters.priority) return false
      if (filters.severity && inc.severity !== filters.severity) return false
      return true
    })
  }, [incidents, filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters({ search: '', status: '', priority: '', severity: '' })
  }

  const handleCreate = async (
    formData: CreateIncidentFormData | UpdateIncidentPayload,
  ) => {
    // Narrow to CreateIncidentFormData (Create dialog passes this shape)
    const data = formData as CreateIncidentFormData
    const payload: CreateIncidentPayload = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      severity: data.severity,
    }
    await createMutation.mutateAsync(payload)
  }

  const handleEdit = async (formData: UpdateIncidentFormData) => {
    if (!editTarget) return
    const payload: UpdateIncidentPayload = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      severity: formData.severity,
      status: formData.status,
      resolution: formData.resolution || undefined,
      assignedTo: formData.assignedTo,
    }
    await updateMutation.mutateAsync({ id: editTarget._id, payload })
    setEditTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget._id)
    setDeleteTarget(null)
  }

  // Columns
  const columns: ColumnDef<Incident>[] = useMemo(() => {
    const cols: ColumnDef<Incident>[] = [
      {
        accessorKey: 'incidentId',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.incidentId}
          </span>
        ),
        size: 130,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.title}</span>
          </div>
        ),
        size: 280,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge status={normalizeStatusVariant(row.original.status)}>
            {row.original.status}
          </StatusBadge>
        ),
        size: 130,
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <StatusBadge status={normalizePriorityVariant(row.original.priority)}>
            {row.original.priority}
          </StatusBadge>
        ),
        size: 100,
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => (
          <StatusBadge status={normalizeSeverityVariant(row.original.severity)}>
            {row.original.severity}
          </StatusBadge>
        ),
        size: 100,
      },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned To',
        cell: ({ row }) => (
          <span className="text-sm">{getUserDisplay(row.original.assignedTo)}</span>
        ),
        size: 160,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        size: 150,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewTarget(row.original)}
              title="View details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditTarget(row.original)}
              title="Edit incident"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(row.original)}
                title="Delete incident (admin)"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
        size: 120,
      },
    ]
    return cols
  }, [isAdmin])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incidents"
        description="Manage and track service disruptions and outages."
        icon={AlertTriangle}
        breadcrumbs={[{ label: 'Incidents' }]}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Incident
          </Button>
        }
      />

      <FilterBar
        fields={filterFields}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner label="Loading incidents…" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load incidents"
          description="There was a problem fetching incident data."
          onRetry={refetch}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredIncidents}
          emptyTitle="No incidents found"
          emptyDescription="No incidents match your current filters, or no incidents have been created yet."
          onRetry={handleResetFilters}
        />
      )}

      {/* Create dialog */}
      <IncidentFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        isAdmin={isAdmin}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* View dialog */}
      <IncidentViewDialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => !open && setViewTarget(null)}
        incident={viewTarget}
      />

      {/* Edit dialog */}
      <IncidentEditDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
        incident={editTarget}
        onSubmit={handleEdit}
        isLoading={updateMutation.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Incident"
        description={
          deleteTarget
            ? `Are you sure you want to delete incident ${deleteTarget.incidentId}? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
