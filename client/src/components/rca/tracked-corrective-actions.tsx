import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { RCAConfirmDialog } from '@/components/rca/rca-confirm-dialog'
import { CorrectiveActionFormDialog } from './corrective-action-form-dialog'
import {
  useRcaActions,
  useCreateRcaAction,
  useUpdateRcaAction,
  useDeleteRcaAction,
  useRcaBusy,
} from '@/hooks/useRcas'
import { rcaError } from '@/lib/rcaApi'
import {
  rcaDate,
  rcaStatusVariant,
  userLabel,
  type CorrectiveAction,
} from '@/types/rca'

export function TrackedCorrectiveActions({
  id,
  canManage,
}: {
  id: string
  canManage: boolean
}) {
  const query = useRcaActions(id)
  const create = useCreateRcaAction()
  const update = useUpdateRcaAction()
  const remove = useDeleteRcaAction()
  const busy = useRcaBusy()
  const [editing, setEditing] = useState<CorrectiveAction | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CorrectiveAction | null>(null)
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Tracked corrective actions</CardTitle>
          {canManage && (
            <Button size="sm" disabled={busy} onClick={() => setEditing('new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add action
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Assigned work with due dates and progress. These records are separate
          from the corrective action notes above.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isPending ? (
          <LoadingSpinner />
        ) : query.isError ? (
          <ErrorState
            description={rcaError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.length ? (
          <EmptyState
            title="No tracked actions"
            description="No assigned corrective work has been recorded for this RCA."
          />
        ) : (
          query.data.map((action) => (
            <article
              key={action._id}
              className="space-y-3 rounded-md border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{action.title}</h3>
                <StatusBadge status={rcaStatusVariant(action.status)}>
                  {action.status}
                </StatusBadge>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">
                {action.description}
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Assigned to</dt>
                  <dd>{userLabel(action.assignedTo)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Due</dt>
                  <dd>{rcaDate(action.dueDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created by</dt>
                  <dd>{userLabel(action.createdBy)}</dd>
                </div>
                {action.completedAt && (
                  <div>
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd>{rcaDate(action.completedAt)}</dd>
                  </div>
                )}
              </dl>
              {canManage && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setEditing(action)}
                  >
                    Edit / update status
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => setDeleting(action)}
                  >
                    Delete action
                  </Button>
                </div>
              )}
            </article>
          ))
        )}
        {canManage && editing && (
          <CorrectiveActionFormDialog
            action={editing === 'new' ? undefined : editing}
            onClose={() => setEditing(null)}
            onCreate={(payload) => create.mutateAsync({ id, payload })}
            onUpdate={(payload) =>
              editing !== 'new'
                ? update.mutateAsync({ id, actionId: editing._id, payload })
                : Promise.reject(new Error('Select an action'))
            }
          />
        )}
        {canManage && (
          <RCAConfirmDialog
            open={Boolean(deleting)}
            onOpenChange={(open) => {
              if (!open && !busy) setDeleting(null)
            }}
            title="Delete tracked action?"
            description={`Permanently delete “${deleting?.title ?? ''}”?`}
            confirmLabel="Delete action"
            confirmVariant="destructive"
            loading={busy}
            onCancel={() => {
              if (!busy) setDeleting(null)
            }}
            onConfirm={() => {
              if (deleting && !busy)
                remove.mutate(
                  { id, actionId: deleting._id },
                  { onSuccess: () => setDeleting(null) },
                )
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
