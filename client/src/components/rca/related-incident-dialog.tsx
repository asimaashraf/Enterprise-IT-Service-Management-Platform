import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import { useRcaScope } from '@/hooks/useRcas'
import { incidentApi } from '@/lib/incidentApi'
import { rcaError } from '@/lib/rcaApi'
import { getUserDisplay, normalizeStatusVariant } from '@/types/incident'
import { rcaDate } from '@/types/rca'

export function RelatedIncidentDialog({
  incidentId,
  onClose,
}: {
  incidentId: string
  onClose: () => void
}) {
  const scope = useRcaScope()
  const query = useQuery({
    queryKey: [...scope.key, 'related-incident', incidentId],
    queryFn: () => incidentApi.get(incidentId),
    enabled: scope.enabled && Boolean(incidentId),
    gcTime: 0,
    staleTime: 0,
    retry: false,
  })
  const incident = query.data
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-6">
          <DialogTitle>
            {incident?.incidentId || 'Related Incident'}
          </DialogTitle>
          <DialogDescription
            className={
              incident
                ? 'break-words text-base font-medium text-foreground'
                : undefined
            }
          >
            {incident?.title || 'Read-only details of the linked Incident.'}
          </DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <div
            role="status"
            className="flex items-center justify-center gap-3 py-8"
          >
            <LoadingSpinner />
            <span className="text-sm text-muted-foreground">
              Loading Incident…
            </span>
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Incident could not be loaded"
            description={rcaError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : incident ? (
          <div className="space-y-5">
            <StatusBadge status={normalizeStatusVariant(incident.status)}>
              {incident.status || 'Status unavailable'}
            </StatusBadge>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="mb-1 text-muted-foreground">Description</dt>
                <dd className="whitespace-pre-wrap break-words">
                  {incident.description || 'No description provided.'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-muted-foreground">Priority</dt>
                <dd>{incident.priority || 'Not recorded'}</dd>
              </div>
              <div>
                <dt className="mb-1 text-muted-foreground">Severity</dt>
                <dd>{incident.severity || 'Not recorded'}</dd>
              </div>
              <div>
                <dt className="mb-1 text-muted-foreground">Reported By</dt>
                <dd className="break-words">
                  {incident.reportedBy
                    ? getUserDisplay(incident.reportedBy)
                    : 'Reporter unavailable'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-muted-foreground">Assigned To</dt>
                <dd className="break-words">
                  {getUserDisplay(incident.assignedTo)}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-muted-foreground">Created</dt>
                <dd>{rcaDate(incident.createdAt)}</dd>
              </div>
              <div>
                <dt className="mb-1 text-muted-foreground">Last Updated</dt>
                <dd>{rcaDate(incident.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <ErrorState
            title="Incident unavailable"
            description="The linked Incident could not be found."
          />
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
