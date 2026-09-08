import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2, TrendingUp } from 'lucide-react'

import { EscalationPolicyDialog } from '@/components/sla/escalation-policy-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useCreateEscalationPolicy, useDeleteEscalationPolicy, useEscalationPolicies, useUpdateEscalationPolicy } from '@/hooks/useEscalationPolicies'
import { useSupportTeams } from '@/hooks/useSupportTeams'
import { useUsers } from '@/hooks/useUsers'
import type { EscalationPolicy } from '@/types/incident'

const thresholdLabel = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`

export function EscalationPoliciesPage() {
  const policiesQuery = useEscalationPolicies()
  const usersQuery = useUsers()
  const teamsQuery = useSupportTeams()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<EscalationPolicy | null>(null)
  const [deletingPolicy, setDeletingPolicy] = useState<EscalationPolicy | null>(null)
  const closeDialog = () => { setDialogOpen(false); setEditingPolicy(null) }
  const createMutation = useCreateEscalationPolicy(closeDialog)
  const updateMutation = useUpdateEscalationPolicy(closeDialog)
  const deleteMutation = useDeleteEscalationPolicy(() => setDeletingPolicy(null))

  const columns = useMemo<ColumnDef<EscalationPolicy>[]>(() => [
    { accessorKey: 'name', header: 'Policy', enableSorting: true },
    { accessorKey: 'priority', header: 'Priority', enableSorting: true },
    { accessorKey: 'escalationLevel', header: 'Level' },
    { accessorKey: 'thresholdMinutes', header: 'Threshold', cell: ({ row }) => thresholdLabel(row.original.thresholdMinutes) },
    { id: 'target', header: 'Target', cell: ({ row }) => row.original.targetType === 'User' ? row.original.targetUser ? `${row.original.targetUser.name} (${row.original.targetUser.email})` : 'User unavailable' : row.original.targetTeam?.name ?? 'Support team unavailable' },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} /> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => <div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Edit ${row.original.name}`} onClick={() => { setEditingPolicy(row.original); setDialogOpen(true) }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`Delete ${row.original.name}`} onClick={() => setDeletingPolicy(row.original)}><Trash2 className="h-4 w-4" /></Button></div> },
  ], [])

  if (policiesQuery.isError) return <ErrorState title="Escalation policies could not be loaded" description={policiesQuery.error instanceof Error ? policiesQuery.error.message : undefined} onRetry={() => policiesQuery.refetch()} />

  return <div className="space-y-6"><PageHeader title="Escalation Policies" description="Manage priority-based SLA escalation targets for this organization." icon={TrendingUp} actions={<Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Policy</Button>} /><DataTable columns={columns} data={policiesQuery.data ?? []} loading={policiesQuery.isLoading} emptyTitle="No escalation policies" emptyDescription="Create a policy to route SLA breaches to a user or support team." onRetry={() => policiesQuery.refetch()} /><EscalationPolicyDialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()} policy={editingPolicy} users={usersQuery.data ?? []} teams={teamsQuery.data ?? []} submitting={createMutation.isPending || updateMutation.isPending} onCreate={(payload) => createMutation.mutate(payload)} onUpdate={(payload) => editingPolicy && updateMutation.mutate({ id: editingPolicy._id, payload })} /><ConfirmDialog open={Boolean(deletingPolicy)} onOpenChange={(open) => !open && setDeletingPolicy(null)} title="Delete escalation policy?" description={deletingPolicy ? `This permanently deletes ${deletingPolicy.name}.` : undefined} confirmLabel="Delete" confirmVariant="destructive" loading={deleteMutation.isPending} onConfirm={() => deletingPolicy && deleteMutation.mutate(deletingPolicy._id)} onCancel={() => setDeletingPolicy(null)} /></div>
}

