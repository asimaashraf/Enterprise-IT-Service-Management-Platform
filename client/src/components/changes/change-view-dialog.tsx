import { useState } from 'react'
import { CalendarClock, CheckCircle, RotateCcw, User, Wrench, XCircle } from 'lucide-react'

import { ChangeWorkflowDialog, type ChangeWorkflowAction } from '@/components/changes/change-workflow-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import { useChange } from '@/hooks/useChanges'
import { getChangeUserDisplay, normalizeChangeStatus, type Change, type ChangeStatus, type UpdateChangePayload } from '@/types/change'

const workflowActions: Record<ChangeStatus, ChangeWorkflowAction[]> = {
  Draft: [{ status: 'Pending Approval', label: 'Submit for Approval' }, { status: 'Cancelled', label: 'Cancel Change', destructive: true }],
  'Pending Approval': [{ status: 'Approved', label: 'Approve Change' }, { status: 'Rejected', label: 'Reject Change', destructive: true, reasonField: 'approvalReason' }, { status: 'Cancelled', label: 'Cancel Change', destructive: true }],
  Approved: [{ status: 'Scheduled', label: 'Schedule Change' }, { status: 'In Progress', label: 'Start Change' }, { status: 'Cancelled', label: 'Cancel Change', destructive: true }],
  Scheduled: [{ status: 'In Progress', label: 'Start Change' }, { status: 'Cancelled', label: 'Cancel Change', destructive: true }],
  'In Progress': [{ status: 'Completed', label: 'Complete Change' }, { status: 'Failed', label: 'Mark as Failed', destructive: true, reasonField: 'failureReason' }],
  Completed: [],
  Failed: [],
  Rejected: [],
  Cancelled: [],
}

const displayDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 py-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3"><span className="text-muted-foreground">{label}</span><span className="min-w-0 break-words">{value}</span></div>
}

interface ChangeViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  change: Change | null
  isAdmin: boolean
  workflowSubmitting: boolean
  onRequestAssignment: (change: Change) => void
  onWorkflow: (id: string, payload: UpdateChangePayload) => Promise<unknown>
}

export function ChangeViewDialog({ open, onOpenChange, change, isAdmin, workflowSubmitting, onRequestAssignment, onWorkflow }: ChangeViewDialogProps) {
  const detailQuery = useChange(change?._id ?? '', open && Boolean(change))
  const detail = detailQuery.data ?? change
  const [selectedAction, setSelectedAction] = useState<ChangeWorkflowAction | null>(null)

  const submitWorkflow = async (payload: UpdateChangePayload) => {
    if (!detail) return
    try {
      await onWorkflow(detail._id, payload)
      setSelectedAction(null)
    } catch {
      // Mutation hooks surface the API error through the shared toast pattern.
    }
  }

  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">{detailQuery.isLoading || !detail ? <div className="flex min-h-48 items-center justify-center"><LoadingSpinner /></div> : detailQuery.isError ? <ErrorState description={detailQuery.error instanceof Error ? detailQuery.error.message : 'Change details could not be loaded.'} onRetry={() => detailQuery.refetch()} /> : <><DialogHeader><DialogTitle>{detail.changeId}</DialogTitle><DialogDescription className="text-base font-medium text-foreground">{detail.title}</DialogDescription></DialogHeader><div className="space-y-4"><div className="flex flex-wrap gap-2"><StatusBadge status={normalizeChangeStatus(detail.status)}>{detail.status}</StatusBadge><StatusBadge status="outline">{detail.type}</StatusBadge><StatusBadge status={detail.risk.toLowerCase()}>{detail.risk} risk</StatusBadge></div>{isAdmin && <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Wrench className="h-4 w-4" />Operational actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={workflowSubmitting} onClick={() => onRequestAssignment(detail)}>Assign Change</Button>{workflowActions[detail.status].map((action) => <Button key={action.status} size="sm" variant={action.destructive ? 'destructive' : 'default'} disabled={workflowSubmitting} onClick={() => setSelectedAction(action)}>{action.label}</Button>)}</CardContent></Card>}<Card><CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm">{detail.description}</p></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><User className="h-4 w-4" />People</CardTitle></CardHeader><CardContent className="divide-y"><Row label="Requested by" value={getChangeUserDisplay(detail.requestedBy)} /><Row label="Assigned to" value={getChangeUserDisplay(detail.assignedTo)} /></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4" />Schedule and assets</CardTitle></CardHeader><CardContent className="divide-y"><Row label="Planned start" value={displayDate(detail.plannedStartAt)} /><Row label="Planned end" value={displayDate(detail.plannedEndAt)} /><Row label="Affected assets" value={detail.affectedAssets?.length ? detail.affectedAssets.map((asset) => `${asset.assetId} — ${asset.name}`).join(', ') : 'None'} /></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><RotateCcw className="h-4 w-4" />Rollback plan</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm">{detail.rollbackPlan || 'Not provided'}</p></CardContent></Card>{(detail.approvedAt || detail.rejectedAt) && <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4" />Approval</CardTitle></CardHeader><CardContent className="divide-y">{detail.approvedAt && <><Row label="Approved by" value={getChangeUserDisplay(detail.approvedBy)} /><Row label="Approved at" value={displayDate(detail.approvedAt)} /></>}{detail.rejectedAt && <><Row label="Rejected by" value={getChangeUserDisplay(detail.rejectedBy)} /><Row label="Rejected at" value={displayDate(detail.rejectedAt)} />{detail.approvalReason && <Row label="Reason" value={detail.approvalReason} />}</>}</CardContent></Card>}{(detail.startedAt || detail.completedAt || detail.failedAt || detail.cancelledAt) && <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><XCircle className="h-4 w-4" />Execution</CardTitle></CardHeader><CardContent className="divide-y">{detail.startedAt && <Row label="Started" value={displayDate(detail.startedAt)} />}{detail.completedAt && <Row label="Completed" value={displayDate(detail.completedAt)} />}{detail.failedAt && <Row label="Failed" value={displayDate(detail.failedAt)} />}{detail.failureReason && <Row label="Failure reason" value={detail.failureReason} />}{detail.cancelledAt && <Row label="Cancelled" value={displayDate(detail.cancelledAt)} />}</CardContent></Card>}<div className="text-xs text-muted-foreground">Created {displayDate(detail.createdAt)} · Last updated {displayDate(detail.updatedAt)}</div></div></>}</DialogContent></Dialog><ChangeWorkflowDialog open={Boolean(selectedAction)} onOpenChange={(nextOpen) => !nextOpen && setSelectedAction(null)} change={detail} action={selectedAction} submitting={workflowSubmitting} onSubmit={submitWorkflow} /></>
}
