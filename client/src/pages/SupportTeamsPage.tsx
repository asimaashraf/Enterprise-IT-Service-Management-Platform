import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'

import { SupportTeamDialog } from '@/components/support-teams/support-team-dialog'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { settingsError } from '@/lib/settingsApi'
import { useSettingsScope } from '@/hooks/useSettingsScope'
import { DataTable } from '@/components/ui/data-table'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  useCreateSupportTeam,
  useDeleteSupportTeam,
  useSupportTeams,
  useUpdateSupportTeam,
} from '@/hooks/useSupportTeams'
import { useUsers } from '@/hooks/useUsers'
import type {
  CreateSupportTeamPayload,
  SupportTeam,
  UpdateSupportTeamPayload,
} from '@/types/supportTeam'

function SupportTeamsContent() {
  const scope = useSettingsScope()
  const teamsQuery = useSupportTeams()
  const adminsQuery = useUsers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<SupportTeam | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<SupportTeam | null>(null)

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingTeam(null)
  }
  const createMutation = useCreateSupportTeam(closeDialog)
  const updateMutation = useUpdateSupportTeam(closeDialog)
  const deleteMutation = useDeleteSupportTeam(() => setDeletingTeam(null))

  const candidates = useMemo(
    () => (adminsQuery.data ?? []).filter((user) => user.role === 'admin' && user.isActive && user.organizationId === scope.user?.organizationId),
    [adminsQuery.data, scope.user?.organizationId],
  )

  const columns = useMemo<ColumnDef<SupportTeam>[]>(
    () => [
      { accessorKey: 'name', header: 'Team', enableSorting: true },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => row.original.description || '—',
      },
      {
        id: 'members',
        header: 'Members',
        cell: ({ row }) => `${row.original.members.length} member${row.original.members.length === 1 ? '' : 's'}`,
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${row.original.name}`}
              onClick={() => {
                setEditingTeam(row.original)
                setDialogOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => setDeletingTeam(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  if (teamsQuery.isError) {
    return (
      <ErrorState
        description={
          teamsQuery.error instanceof Error
            ? teamsQuery.error.message
            : 'Support teams could not be loaded.'
        }
        onRetry={() => teamsQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Teams"
        description="Manage the active administrator teams that provide operational support."
        icon={Users}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Support Team
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={teamsQuery.data ?? []}
        loading={teamsQuery.isLoading}
        emptyTitle="No support teams"
        emptyDescription="Create a support team to organize eligible operational assignees."
        onRetry={() => teamsQuery.refetch()}
      />

      <SupportTeamDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
          else setDialogOpen(true)
        }}
        team={editingTeam}
        candidates={candidates}
        candidatesLoading={adminsQuery.isLoading}
        candidatesError={adminsQuery.isError}
        submitting={createMutation.isPending || updateMutation.isPending}
        onCreate={(payload: CreateSupportTeamPayload) => createMutation.mutate(payload)}
        onUpdate={(payload: UpdateSupportTeamPayload) => {
          if (editingTeam) {
            updateMutation.mutate({ id: editingTeam._id, payload })
          }
        }}
      />

      <AlertDialog open={!!deletingTeam} onOpenChange={(open) => {
        if (!open && !deleteMutation.isPending) { setDeletingTeam(null); deleteMutation.reset() }
      }}>
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete support team?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">This permanently deletes {deletingTeam?.name}. Teams referenced by an escalation policy cannot be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isError && <p role="alert" className="text-sm text-destructive">{settingsError(deleteMutation.error)}</p>}
          <AlertDialogFooter>
            <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => { setDeletingTeam(null); deleteMutation.reset() }}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (deletingTeam) deleteMutation.mutate(deletingTeam._id) }}>{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function SupportTeamsPage() {
  const scope = useSettingsScope()
  if (!scope.isAdmin) return null
  return <SupportTeamsContent key={JSON.stringify(scope.key)} />
}
