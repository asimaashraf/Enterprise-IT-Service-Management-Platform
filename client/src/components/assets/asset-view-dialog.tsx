import { format } from 'date-fns'
import { History, ShieldCheck, User, Wrench, type LucideIcon } from 'lucide-react'
import { useSelector } from 'react-redux'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  useAsset,
  useAssetAudit,
  useAssetLifecycleHistory,
  useAssetMaintenanceHistory,
} from '@/hooks/useAssets'
import type { RootState } from '@/store/store'
import {
  getAssetActorDisplay,
  getAssetAssigneeDisplay,
  normalizeAssetStatus,
  type Asset,
  type AssetStatus,
} from '@/types/asset'

const displayDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy HH:mm')
}

const lifecycleTargets = (asset: Asset): AssetStatus[] => {
  if (asset.assignedTo || asset.status === 'Assigned') return []
  switch (asset.status) {
    case 'Available':
      return ['Maintenance', 'Retired']
    case 'Maintenance':
      return ['Available', 'Retired']
    default:
      return []
  }
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
)

interface AssetViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset | null
  transitioning: boolean
  onTransition: (status: AssetStatus) => void
}

export function AssetViewDialog({
  open,
  onOpenChange,
  asset,
  transitioning,
  onTransition,
}: AssetViewDialogProps) {
  const isAdmin = useSelector((state: RootState) => state.auth.user?.role === 'admin')
  const assetId = asset?._id ?? ''
  const detailQuery = useAsset(assetId, open)
  const lifecycleQuery = useAssetLifecycleHistory(assetId, open)
  const maintenanceQuery = useAssetMaintenanceHistory(assetId, open)
  const auditQuery = useAssetAudit(assetId, open && isAdmin)
  const detail = detailQuery.data ?? asset
  const targets = detail ? lifecycleTargets(detail) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {detailQuery.isLoading || !detail ? (
          <div className="flex min-h-48 items-center justify-center"><LoadingSpinner /></div>
        ) : detailQuery.isError ? (
          <ErrorState
            description={detailQuery.error instanceof Error ? detailQuery.error.message : 'Asset details could not be loaded.'}
            onRetry={() => detailQuery.refetch()}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{detail.assetId}</DialogTitle>
              <DialogDescription className="text-base font-medium text-foreground">{detail.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={normalizeAssetStatus(detail.status)}>{detail.status}</StatusBadge>
                <StatusBadge status="outline">{detail.category}</StatusBadge>
                {detail.warrantyStatus && <StatusBadge status={detail.warrantyStatus === 'Expired' ? 'critical' : 'default'}>{detail.warrantyStatus}</StatusBadge>}
              </div>

              {isAdmin && targets.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Lifecycle actions</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {targets.map((status) => <Button key={status} size="sm" variant="outline" disabled={transitioning} onClick={() => onTransition(status)}>{transitioning ? 'Updating…' : `Move to ${status}`}</Button>)}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Asset details</CardTitle></CardHeader>
                <CardContent className="divide-y">
                  <InfoRow label="Category" value={detail.category} />
                  <InfoRow label="Purchase date" value={displayDate(detail.purchaseDate)} />
                  <InfoRow label="Purchase price" value={detail.purchasePrice === undefined ? '—' : detail.purchasePrice.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} />
                  <InfoRow label="Created" value={displayDate(detail.createdAt)} />
                  {detail.description && <InfoRow label="Description" value={detail.description} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><User className="h-4 w-4" />Assignment</CardTitle></CardHeader>
                <CardContent><InfoRow label="Assigned to" value={getAssetAssigneeDisplay(detail.assignedTo)} /></CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Warranty</CardTitle></CardHeader>
                <CardContent className="divide-y">
                  <InfoRow label="Status" value={detail.warrantyStatus ?? 'Not covered'} />
                  <InfoRow label="Provider" value={detail.warrantyProvider ?? '—'} />
                  <InfoRow label="Start date" value={displayDate(detail.warrantyStartDate)} />
                  <InfoRow label="End date" value={displayDate(detail.warrantyEndDate)} />
                </CardContent>
              </Card>

              <HistorySection title="Lifecycle history" icon={History} loading={lifecycleQuery.isLoading} error={lifecycleQuery.isError ? lifecycleQuery.error : undefined} onRetry={() => lifecycleQuery.refetch()} empty="No lifecycle events recorded.">
                {(lifecycleQuery.data ?? []).map((record) => <div key={record._id} className="divide-y rounded-md border px-3"><InfoRow label="Transition" value={`${record.previousStatus} → ${record.newStatus}`} /><InfoRow label="Changed" value={displayDate(record.changedAt)} /><InfoRow label="Changed by" value={getAssetActorDisplay(record.changedBy)} /></div>)}
              </HistorySection>

              <HistorySection title="Maintenance history" icon={Wrench} loading={maintenanceQuery.isLoading} error={maintenanceQuery.isError ? maintenanceQuery.error : undefined} onRetry={() => maintenanceQuery.refetch()} empty="No maintenance records available.">
                {(maintenanceQuery.data ?? []).map((record) => <div key={record._id} className="rounded-md border px-3"><InfoRow label="Type" value={record.type} /><InfoRow label="Status" value={record.status} /><InfoRow label="Date" value={displayDate(record.date)} /><InfoRow label="Cost" value={record.cost === undefined ? '—' : record.cost.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} /><InfoRow label="Created by" value={getAssetActorDisplay(record.createdBy)} /><p className="border-t py-2 text-sm"><span className="text-muted-foreground">Description: </span>{record.description}</p></div>)}
              </HistorySection>

              {isAdmin && <HistorySection title="Relevant audit records" icon={ShieldCheck} loading={auditQuery.isLoading} error={auditQuery.isError ? auditQuery.error : undefined} onRetry={() => auditQuery.refetch()} empty="No matching audit records are currently available.">
                <p className="text-xs text-muted-foreground">The existing API returns the tenant audit stream without asset filtering or pagination; records are filtered here by Asset resource ID and may appear after the asynchronous audit write completes.</p>
                {(auditQuery.data ?? []).map((record) => <div key={record._id} className="divide-y rounded-md border px-3"><InfoRow label="Action" value={`${record.action} (${record.outcome})`} /><InfoRow label="Actor" value={record.actorEmail ?? 'System or unavailable'} /><InfoRow label="Recorded" value={displayDate(record.createdAt)} /></div>)}
              </HistorySection>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function HistorySection({
  title,
  icon: Icon,
  loading,
  error,
  onRetry,
  empty,
  children,
}: {
  title: string
  icon: LucideIcon
  loading: boolean
  error: unknown
  onRetry: () => void
  empty: string
  children: React.ReactNode
}) {
  const hasChildren = Array.isArray(children) && children.length > 0
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4" />{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {loading && <LoadingSpinner size={18} />}
        {Boolean(error) && <ErrorState description={error instanceof Error ? error.message : 'This history could not be loaded.'} onRetry={onRetry} />}
        {!loading && !error && !hasChildren && <p className="text-sm text-muted-foreground">{empty}</p>}
        {!loading && !error && children}
      </CardContent>
    </Card>
  )
}
