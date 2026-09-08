import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Boxes, Eye, Link2, Pencil, Plus, Unlink } from 'lucide-react'
import { useSelector } from 'react-redux'

import { AssetAssignmentDialog } from '@/components/assets/asset-assignment-dialog'
import { AssetFormDialog } from '@/components/assets/asset-form-dialog'
import { AssetViewDialog } from '@/components/assets/asset-view-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { ErrorState } from '@/components/ui/error-state'
import { FilterBar, type FilterOption } from '@/components/ui/filter-bar'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAssets, useAssignAsset, useCreateAsset, useUnassignAsset, useUpdateAsset } from '@/hooks/useAssets'
import { useUsers } from '@/hooks/useUsers'
import type { RootState } from '@/store/store'
import {
  getAssetAssigneeDisplay,
  normalizeAssetStatus,
  type Asset,
  type AssetCategory,
  type AssetFilters,
  type CreateAssetPayload,
  type UpdateAssetPayload,
} from '@/types/asset'

const categories: AssetCategory[] = [
  'Laptop', 'Desktop', 'Server', 'Switch', 'Router', 'License', 'Mobile Device',
]
const categoryOptions: FilterOption[] = [
  { label: 'All Categories', value: '' },
  ...categories.map((category) => ({ label: category, value: category })),
]
const statusOptions: FilterOption[] = [
  { label: 'All Statuses', value: '' },
  ...['Available', 'Assigned', 'Maintenance', 'Retired'].map((status) => ({ label: status, value: status })),
]
const filterFields = [
  { key: 'search', type: 'search' as const, label: 'Search', placeholder: 'Search assets…' },
  { key: 'category', type: 'select' as const, label: 'Category', options: categoryOptions, placeholder: 'Category' },
  { key: 'status', type: 'select' as const, label: 'Status', options: statusOptions, placeholder: 'Status' },
]

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const warrantyDisplay = (asset: Asset) => {
  if (!asset.warrantyEndDate) return 'Not covered'
  return `${asset.warrantyProvider ? `${asset.warrantyProvider} · ` : ''}${formatDate(asset.warrantyEndDate)}`
}

export function AssetsPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role === 'admin'
  const assetsQuery = useAssets()
  const employeesQuery = useUsers()
  const createMutation = useCreateAsset()
  const updateMutation = useUpdateAsset()
  const assignMutation = useAssignAsset()
  const unassignMutation = useUnassignAsset()
  const [filters, setFilters] = useState<AssetFilters>({ search: '', category: '', status: '' })
  const [formOpen, setFormOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [assigningAsset, setAssigningAsset] = useState<Asset | null>(null)
  const [unassigningAsset, setUnassigningAsset] = useState<Asset | null>(null)
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null)

  const employees = useMemo(
    () => (employeesQuery.data ?? []).filter((candidate) => candidate.role === 'employee' && candidate.isActive),
    [employeesQuery.data],
  )
  const filteredAssets = useMemo(() => {
    const search = filters.search.toLowerCase()
    return (assetsQuery.data ?? []).filter((asset) => {
      const matchesSearch = !search || [asset.assetId, asset.name, asset.description ?? '']
        .some((value) => value.toLowerCase().includes(search))
      return matchesSearch && (!filters.category || asset.category === filters.category) && (!filters.status || asset.status === filters.status)
    })
  }, [assetsQuery.data, filters])

  const closeForm = () => {
    setFormOpen(false)
    setEditingAsset(null)
  }

  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      { accessorKey: 'assetId', header: 'Asset ID', enableSorting: true },
      {
        accessorKey: 'name', header: 'Name', enableSorting: true,
        cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p>{row.original.description && <p className="max-w-xs truncate text-xs text-muted-foreground">{row.original.description}</p>}</div>,
      },
      { accessorKey: 'category', header: 'Category', enableSorting: true },
      { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={normalizeAssetStatus(row.original.status)}>{row.original.status}</StatusBadge> },
      { accessorKey: 'assignedTo', header: 'Assignee', cell: ({ row }) => getAssetAssigneeDisplay(row.original.assignedTo) },
      { id: 'warranty', header: 'Warranty', cell: ({ row }) => warrantyDisplay(row.original) },
      {
        id: 'view', header: 'View', enableSorting: false,
        cell: ({ row }) => <Button variant="ghost" size="icon" aria-label={`View ${row.original.name}`} onClick={() => setViewingAsset(row.original)}><Eye className="h-4 w-4" /></Button>,
      },
      ...(isAdmin ? [{
        id: 'actions', header: 'Actions', enableSorting: false,
        cell: ({ row }: { row: { original: Asset } }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label={`Edit ${row.original.name}`} onClick={() => { setEditingAsset(row.original); setFormOpen(true) }}><Pencil className="h-4 w-4" /></Button>
            {row.original.status === 'Available' && <Button variant="ghost" size="icon" aria-label={`Assign ${row.original.name}`} onClick={() => setAssigningAsset(row.original)}><Link2 className="h-4 w-4" /></Button>}
            {row.original.assignedTo && <Button variant="ghost" size="icon" aria-label={`Unassign ${row.original.name}`} onClick={() => setUnassigningAsset(row.original)}><Unlink className="h-4 w-4" /></Button>}
          </div>
        ),
      }] as ColumnDef<Asset>[] : []),
    ],
    [isAdmin],
  )

  if (assetsQuery.isError) {
    return <ErrorState description={assetsQuery.error instanceof Error ? assetsQuery.error.message : 'Assets could not be loaded.'} onRetry={() => assetsQuery.refetch()} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description={isAdmin ? 'Manage your organization’s IT asset inventory.' : 'View assets assigned to you.'}
        icon={Boxes}
        actions={isAdmin ? <Button onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Asset</Button> : undefined}
      />
      <FilterBar fields={filterFields} values={filters} onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))} onReset={() => setFilters({ search: '', category: '', status: '' })} />
      <DataTable columns={columns} data={filteredAssets} loading={assetsQuery.isLoading} emptyTitle={isAdmin ? 'No assets' : 'No assigned assets'} emptyDescription={isAdmin ? 'Create an asset to begin managing your inventory.' : 'Assets assigned to you will appear here.'} onRetry={() => assetsQuery.refetch()} />

      <AssetViewDialog
        open={Boolean(viewingAsset)}
        onOpenChange={(open) => !open && setViewingAsset(null)}
        asset={viewingAsset}
        transitioning={updateMutation.isPending}
        onTransition={(status) => {
          if (viewingAsset) updateMutation.mutate({ id: viewingAsset._id, payload: { status } })
        }}
      />

      {isAdmin && <>
        <AssetFormDialog
          open={formOpen}
          onOpenChange={(open) => open ? setFormOpen(true) : closeForm()}
          asset={editingAsset}
          submitting={createMutation.isPending || updateMutation.isPending}
          onCreate={(payload: CreateAssetPayload) => createMutation.mutate(payload, { onSuccess: closeForm })}
          onUpdate={(payload: UpdateAssetPayload) => { if (editingAsset) updateMutation.mutate({ id: editingAsset._id, payload }, { onSuccess: closeForm }) }}
        />
        <AssetAssignmentDialog
          open={Boolean(assigningAsset)} onOpenChange={(open) => !open && setAssigningAsset(null)} asset={assigningAsset}
          employees={employees} loadingEmployees={employeesQuery.isLoading} employeesError={employeesQuery.isError} submitting={assignMutation.isPending}
          onAssign={(employeeId) => { if (assigningAsset) assignMutation.mutate({ id: assigningAsset._id, employeeId }, { onSuccess: () => setAssigningAsset(null) }) }}
        />
        <ConfirmDialog
          open={Boolean(unassigningAsset)} onOpenChange={(open) => !open && setUnassigningAsset(null)} title="Unassign asset?"
          description={unassigningAsset ? `This returns ${unassigningAsset.assetId} to Available.` : undefined} confirmLabel="Unassign" loading={unassignMutation.isPending}
          onConfirm={() => { if (unassigningAsset) unassignMutation.mutate(unassigningAsset._id, { onSuccess: () => setUnassigningAsset(null) }) }} onCancel={() => setUnassigningAsset(null)}
        />
      </>}
    </div>
  )
}
