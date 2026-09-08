import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, GitBranch, Pencil, Plus } from 'lucide-react'
import { useSelector } from 'react-redux'

import { ChangeFormDialog } from '@/components/changes/change-form-dialog'
import { ChangeAssignmentDialog } from '@/components/changes/change-assignment-dialog'
import { ChangeViewDialog } from '@/components/changes/change-view-dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ErrorState } from '@/components/ui/error-state'
import { FilterBar, type FilterOption } from '@/components/ui/filter-bar'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAssets } from '@/hooks/useAssets'
import { useChanges, useCreateChange, useUpdateChange } from '@/hooks/useChanges'
import { useUsers } from '@/hooks/useUsers'
import type { RootState } from '@/store'
import { changeRisks, changeStatuses, changeTypes, getChangeUserDisplay, getChangeUserId, normalizeChangeStatus, type Change, type ChangeFilters, type CreateChangePayload, type UpdateChangePayload } from '@/types/change'

const filterOptions = (label: string, values: string[]): FilterOption[] => [
  { label: `All ${label}`, value: '' },
  ...values.map((value) => ({ label: value, value })),
]

const filterFields = [
  { key: 'search', type: 'search' as const, label: 'Search', placeholder: 'Search changes…' },
  { key: 'type', type: 'select' as const, label: 'Type', options: filterOptions('Types', changeTypes), placeholder: 'Type' },
  { key: 'risk', type: 'select' as const, label: 'Risk', options: filterOptions('Risks', changeRisks), placeholder: 'Risk' },
  { key: 'status', type: 'select' as const, label: 'Status', options: filterOptions('Statuses', changeStatuses), placeholder: 'Status' },
]

const displayDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const scheduleDisplay = (change: Change) => {
  if (!change.plannedStartAt && !change.plannedEndAt) return 'Not scheduled'
  return `${displayDate(change.plannedStartAt)} – ${displayDate(change.plannedEndAt)}`
}

export function ChangesPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role === 'admin'
  const changesQuery = useChanges()
  const assetsQuery = useAssets()
  const createMutation = useCreateChange()
  const updateMutation = useUpdateChange()
  const employeesQuery = useUsers()
  const [filters, setFilters] = useState<ChangeFilters>({ search: '', type: '', risk: '', status: '' })
  const [formOpen, setFormOpen] = useState(false)
  const [editingChange, setEditingChange] = useState<Change | null>(null)
  const [viewingChange, setViewingChange] = useState<Change | null>(null)
  const [assigningChange, setAssigningChange] = useState<Change | null>(null)

  const employees = useMemo(
    () => (employeesQuery.data ?? []).filter((candidate) => candidate.role === 'employee' && candidate.isActive),
    [employeesQuery.data],
  )

  const filteredChanges = useMemo(() => {
    const search = filters.search.toLowerCase()
    return (changesQuery.data ?? []).filter((change) => {
      const matchesSearch = !search || [change.changeId, change.title, change.description, change.type, change.risk, change.status]
        .some((value) => value.toLowerCase().includes(search))
      return matchesSearch && (!filters.type || change.type === filters.type) && (!filters.risk || change.risk === filters.risk) && (!filters.status || change.status === filters.status)
    })
  }, [changesQuery.data, filters])

  const closeForm = () => {
    setFormOpen(false)
    setEditingChange(null)
  }
  const canEdit = useCallback(
    (change: Change) => isAdmin || (user?.role === 'employee' && change.status === 'Draft' && getChangeUserId(change.requestedBy) === user.id),
    [isAdmin, user?.id, user?.role],
  )

  const columns = useMemo<ColumnDef<Change>[]>(() => [
    { accessorKey: 'changeId', header: 'Change ID', enableSorting: true, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.changeId}</span> },
    { accessorKey: 'title', header: 'Title', enableSorting: true, cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-muted-foreground">{row.original.type}</p></div> },
    { accessorKey: 'type', header: 'Type', enableSorting: true },
    { accessorKey: 'risk', header: 'Risk', cell: ({ row }) => <StatusBadge status={row.original.risk.toLowerCase()}>{row.original.risk}</StatusBadge> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={normalizeChangeStatus(row.original.status)}>{row.original.status}</StatusBadge> },
    { accessorKey: 'requestedBy', header: 'Requester', cell: ({ row }) => getChangeUserDisplay(row.original.requestedBy) },
    { accessorKey: 'assignedTo', header: 'Assignee', cell: ({ row }) => getChangeUserDisplay(row.original.assignedTo) },
    { id: 'schedule', header: 'Schedule', cell: ({ row }) => <span className="max-w-44 text-xs text-muted-foreground">{scheduleDisplay(row.original)}</span> },
    { id: 'actions', header: 'Actions', enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label={`View ${row.original.changeId}`} onClick={() => setViewingChange(row.original)}><Eye className="h-4 w-4" /></Button>{canEdit(row.original) && <Button variant="ghost" size="icon" aria-label={`Edit ${row.original.changeId}`} onClick={() => { setEditingChange(row.original); setFormOpen(true) }}><Pencil className="h-4 w-4" /></Button>}</div> },
  ], [canEdit])

  if (changesQuery.isError) return <ErrorState title="Changes could not be loaded" description={changesQuery.error instanceof Error ? changesQuery.error.message : 'There was a problem fetching Change data.'} onRetry={() => changesQuery.refetch()} />

  return <div className="space-y-6"><PageHeader title="Changes" description={isAdmin ? 'Review and manage Change Requests across your organization.' : 'Create and track your Change Requests.'} icon={GitBranch} breadcrumbs={[{ label: 'Changes' }]} actions={<Button onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />New Change</Button>} /><FilterBar fields={filterFields} values={filters} onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))} onReset={() => setFilters({ search: '', type: '', risk: '', status: '' })} /><DataTable columns={columns} data={filteredChanges} loading={changesQuery.isLoading} emptyTitle={isAdmin ? 'No Changes found' : 'No Change Requests found'} emptyDescription={isAdmin ? 'Create a Change Request to begin managing planned work.' : 'Create a Change Request to begin tracking your planned work.'} onRetry={() => changesQuery.refetch()} /><ChangeFormDialog open={formOpen} onOpenChange={(open) => open ? setFormOpen(true) : closeForm()} change={editingChange} assets={assetsQuery.data ?? []} submitting={createMutation.isPending || updateMutation.isPending} onCreate={(payload: CreateChangePayload) => createMutation.mutate(payload, { onSuccess: closeForm })} onUpdate={(payload: UpdateChangePayload) => { if (editingChange) updateMutation.mutate({ id: editingChange._id, payload }, { onSuccess: closeForm }) }} /><ChangeViewDialog open={Boolean(viewingChange)} onOpenChange={(open) => !open && setViewingChange(null)} change={viewingChange} isAdmin={isAdmin} workflowSubmitting={updateMutation.isPending} onRequestAssignment={setAssigningChange} onWorkflow={(id, payload) => updateMutation.mutateAsync({ id, payload })} />{isAdmin && <ChangeAssignmentDialog open={Boolean(assigningChange)} onOpenChange={(open) => !open && setAssigningChange(null)} change={assigningChange} employees={employees} loadingEmployees={employeesQuery.isLoading} employeesError={employeesQuery.isError} submitting={updateMutation.isPending} onAssign={(employeeId) => { if (assigningChange) updateMutation.mutate({ id: assigningChange._id, payload: { assignedTo: employeeId } }, { onSuccess: () => setAssigningChange(null) }) }} />}</div>
}
