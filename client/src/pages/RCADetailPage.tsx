import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Microscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { RCAConfirmDialog } from '@/components/rca/rca-confirm-dialog'
import { RCAFormDialog } from '@/components/rca/rca-form-dialog'
import { TrackedCorrectiveActions } from '@/components/rca/tracked-corrective-actions'
import { RelatedIncidentDialog } from '@/components/rca/related-incident-dialog'
import {
  useRca,
  useRcaScope,
  useRcaBusy,
  useUpdateRca,
  useDeleteRca,
} from '@/hooks/useRcas'
import { rcaError } from '@/lib/rcaApi'
import {
  problemLabel,
  userLabel,
  referenceId,
  rcaDate,
  rcaStatusVariant,
  rcaTransitions,
  type RCAStatus,
} from '@/types/rca'

function TextItems({
  title,
  items,
  description,
}: {
  title: string
  items?: string[]
  description?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {items?.length ? (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {items.map((item, index) => (
              <li key={index} className="whitespace-pre-wrap break-words">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        )}
      </CardContent>
    </Card>
  )
}
export function RCADetailPage() {
  const { id = '' } = useParams()
  const scope = useRcaScope()
  return <RCADetailWorkspace key={`${scope.key.join(':')}:${id}`} id={id} />
}
function RCADetailWorkspace({ id }: { id: string }) {
  const query = useRca(id)
  const scope = useRcaScope()
  const update = useUpdateRca()
  const remove = useDeleteRca()
  const busy = useRcaBusy()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [nextStatus, setNextStatus] = useState<RCAStatus | null>(null)
  const [viewingIncidentId, setViewingIncidentId] = useState<string | null>(
    null,
  )
  if (query.isPending) return <LoadingSpinner />
  if (query.isError || !query.data)
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link to="/rcas">Back to RCAs</Link>
        </Button>
        <ErrorState
          title="RCA could not be loaded"
          description={rcaError(query.error)}
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  const rca = query.data
  const canManage = scope.user?.role === 'admin' && rca.status !== 'Approved'
  const transitions = rcaTransitions[rca.status]
  return (
    <div className="space-y-6">
      <PageHeader
        title={rca.rcaId}
        description={problemLabel(rca.problem)}
        icon={Microscope}
        breadcrumbs={[
          { label: 'Root Cause Analysis', href: '/rcas' },
          { label: rca.rcaId },
        ]}
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => setEditing(true)}>
                Edit RCA
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => setDeleting(true)}
              >
                Delete RCA
              </Button>
            </div>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={rcaStatusVariant(rca.status)}>
          {rca.status}
        </StatusBadge>
        {rca.status === 'Approved' ? (
          <p className="text-sm text-muted-foreground">
            Approved — this RCA and its tracked actions are read-only.
          </p>
        ) : (
          !canManage && (
            <p className="text-sm text-muted-foreground">
              Read-only access. Administrators manage this investigation.
            </p>
          )
        )}
      </div>
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investigation lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {transitions.map((status) => (
              <Button
                key={status}
                variant={status === 'Approved' ? 'default' : 'outline'}
                disabled={busy}
                onClick={() => setNextStatus(status)}
              >
                {status === 'Approved' ? 'Approve RCA' : `Move to ${status}`}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Root cause</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap break-words text-sm">
            {rca.rootCause}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investigation</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap break-words text-sm">
            {rca.investigation}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TextItems
          title="Contributing factors"
          items={rca.contributingFactors}
        />
        <TextItems
          title="Corrective action notes"
          items={rca.correctiveActions}
          description="Text-only actions recorded in the investigation. Assigned work is shown separately below."
        />
        <TextItems title="Preventive actions" items={rca.preventiveActions} />
        <TextItems title="Lessons learned" items={rca.lessonsLearned} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Related incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {rca.relatedIncidents?.length ? (
            <ul className="space-y-3">
              {rca.relatedIncidents.map((incident, index) => {
                const incidentId = referenceId(incident)
                return (
                  <li
                    key={incidentId || index}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    {incidentId ? (
                      <button
                        type="button"
                        className="text-left text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-haspopup="dialog"
                        onClick={() => setViewingIncidentId(incidentId)}
                      >
                        {typeof incident === 'object' && incident
                          ? `${incident.incidentId || incident._id}${incident.title ? ` — ${incident.title}` : ''}`
                          : incidentId}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">
                        Incident unavailable
                      </span>
                    )}
                    {incident &&
                      typeof incident === 'object' &&
                      incident.status && (
                        <StatusBadge status="outline">
                          {incident.status}
                        </StatusBadge>
                      )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No related incidents.
            </p>
          )}
        </CardContent>
      </Card>
      {viewingIncidentId && (
        <RelatedIncidentDialog
          key={viewingIncidentId}
          incidentId={viewingIncidentId}
          onClose={() => setViewingIncidentId(null)}
        />
      )}
      <TrackedCorrectiveActions id={id} canManage={canManage} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Problem</dt>
              <dd>{problemLabel(rca.problem)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Identified by</dt>
              <dd>{userLabel(rca.identifiedBy)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{rcaDate(rca.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{rcaDate(rca.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      {canManage && editing && (
        <RCAFormDialog
          rca={rca}
          onClose={() => setEditing(false)}
          onCreate={() => Promise.reject(new Error('This RCA already exists'))}
          onUpdate={(payload) => update.mutateAsync({ id, payload })}
        />
      )}
      {canManage && (
        <>
          <RCAConfirmDialog
            open={Boolean(nextStatus && transitions.includes(nextStatus))}
            onOpenChange={(open) => {
              if (!open && !busy) setNextStatus(null)
            }}
            title={
              nextStatus === 'Approved'
                ? 'Approve RCA permanently?'
                : `Move RCA to ${nextStatus ?? ''}?`
            }
            description={
              nextStatus === 'Approved'
                ? 'Approval is terminal. The RCA and all tracked corrective actions become read-only, including unfinished actions.'
                : 'The backend will validate this transition against the current investigation.'
            }
            confirmLabel={
              nextStatus === 'Approved' ? 'Approve RCA' : 'Update status'
            }
            loading={busy}
            onCancel={() => {
              if (!busy) setNextStatus(null)
            }}
            onConfirm={() => {
              if (nextStatus && transitions.includes(nextStatus) && !busy)
                update.mutate(
                  { id, payload: { status: nextStatus } },
                  { onSuccess: () => setNextStatus(null) },
                )
            }}
          />
          <RCAConfirmDialog
            open={deleting}
            onOpenChange={(open) => {
              if (!busy) setDeleting(open)
            }}
            title={`Delete ${rca.rcaId}?`}
            description="This permanently deletes the RCA and its tracked corrective actions. Related Problems and Incidents remain available."
            confirmLabel="Delete RCA"
            confirmVariant="destructive"
            loading={busy}
            onCancel={() => {
              if (!busy) setDeleting(false)
            }}
            onConfirm={() => {
              if (!busy)
                remove.mutate(id, { onSuccess: () => navigate('/rcas') })
            }}
          />
        </>
      )}
    </div>
  )
}
