import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import { getUserDisplay, normalizePriorityVariant, normalizeSeverityVariant, normalizeStatusVariant, type Incident } from '@/types/incident'
import { rcaDate, rcaStatusVariant, userLabel, problemLabel, type RCA } from '@/types/rca'
import { incidentApi } from '@/lib/incidentApi'
import { rcaApi, rcaError } from '@/lib/rcaApi'
import { getNotificationRoute } from '@/lib/notificationRoutes'
import { supportsNotificationPreview } from '@/lib/notificationPreview'
import type { Notification } from '@/types/notification'
import type { RootState } from '@/store'

export function NotificationPreviewDialog({ notification, onClose }: { notification: Notification | null; onClose: () => void }) {
  const user = useSelector((state: RootState) => state.auth.user)
  const entity = notification?.relatedEntity
  const previewSupported = Boolean(notification && supportsNotificationPreview(notification))
  const incidentQuery = useQuery<Incident>({
    queryKey: ['notification-preview', user?.organizationId ?? '', user?.id ?? '', entity?.entityType ?? '', entity?.entityId ?? ''],
    queryFn: () => incidentApi.get(entity?.entityId ?? ''),
    enabled: Boolean(previewSupported && entity?.entityType === 'Incident' && entity.entityId),
    retry: false,
  })
  const rcaQuery = useQuery<RCA>({
    queryKey: ['notification-preview', user?.organizationId ?? '', user?.id ?? '', entity?.entityType ?? '', entity?.entityId ?? ''],
    queryFn: () => rcaApi.get(entity?.entityId ?? ''),
    enabled: Boolean(previewSupported && entity?.entityType === 'RCA' && entity.entityId),
    retry: false,
  })

  const route = getNotificationRoute(entity)
  const query = entity?.entityType === 'Incident' ? incidentQuery : rcaQuery
  const incident = incidentQuery.data
  const rca = rcaQuery.data

  return (
    <Dialog open={Boolean(notification)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-6">
          <DialogTitle>{incident?.incidentId || rca?.rcaId || notification?.title || 'Related record'}</DialogTitle>
          <DialogDescription className="break-words text-base font-medium text-foreground">
            {incident?.title || (rca ? `Root cause analysis for ${problemLabel(rca.problem)}` : notification?.message)}
          </DialogDescription>
        </DialogHeader>
        {!previewSupported ? (
          <p className="py-6 text-sm text-muted-foreground">This related record is not available for preview.</p>
        ) : query.isPending ? (
          <div role="status" className="flex items-center justify-center gap-3 py-8"><LoadingSpinner /><span className="text-sm text-muted-foreground">Loading preview...</span></div>
        ) : query.isError ? (
          <ErrorState title="Preview could not be loaded" description={rcaError(query.error)} onRetry={() => void query.refetch()} />
        ) : incident ? (
          <div className="space-y-4">
            <StatusBadge status={normalizeStatusVariant(incident.status)}>{incident.status}</StatusBadge>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="mb-1 text-muted-foreground">Description</dt><dd className="whitespace-pre-wrap break-words">{incident.description || 'No description provided.'}</dd></div>
              <div><dt className="mb-1 text-muted-foreground">Priority</dt><dd><StatusBadge status={normalizePriorityVariant(incident.priority)}>{incident.priority}</StatusBadge></dd></div>
              <div><dt className="mb-1 text-muted-foreground">Severity</dt><dd><StatusBadge status={normalizeSeverityVariant(incident.severity)}>{incident.severity}</StatusBadge></dd></div>
              <div><dt className="mb-1 text-muted-foreground">Reporter</dt><dd>{getUserDisplay(incident.reportedBy)}</dd></div>
              <div><dt className="mb-1 text-muted-foreground">Assignee</dt><dd>{getUserDisplay(incident.assignedTo)}</dd></div>
              <div><dt className="mb-1 text-muted-foreground">Created</dt><dd>{rcaDate(incident.createdAt)}</dd></div>
              <div><dt className="mb-1 text-muted-foreground">Last updated</dt><dd>{rcaDate(incident.updatedAt)}</dd></div>
            </dl>
          </div>
        ) : rca ? (
          <div className="space-y-4">
            <StatusBadge status={rcaStatusVariant(rca.status)}>{rca.status}</StatusBadge>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div><dt className="mb-1 text-muted-foreground">RCA ID</dt><dd>{rca.rcaId}</dd></div>
              <div><dt className="mb-1 text-muted-foreground">Identified by</dt><dd>{userLabel(rca.identifiedBy)}</dd></div>
              <div className="sm:col-span-2"><dt className="mb-1 text-muted-foreground">Root cause</dt><dd className="whitespace-pre-wrap break-words">{rca.rootCause || 'Not recorded.'}</dd></div>
              <div className="sm:col-span-2"><dt className="mb-1 text-muted-foreground">Investigation</dt><dd className="whitespace-pre-wrap break-words">{rca.investigation || 'Not recorded.'}</dd></div>
              <div><dt className="mb-1 text-muted-foreground">Created</dt><dd>{rcaDate(rca.createdAt)}</dd></div>
              <div><dt className="mb-1 text-muted-foreground">Last updated</dt><dd>{rcaDate(rca.updatedAt)}</dd></div>
            </dl>
          </div>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">This related record is not available for preview.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          {route && <Button asChild><Link to={route} onClick={onClose}>Open full record</Link></Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}