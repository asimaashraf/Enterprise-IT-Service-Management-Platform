import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import type { Change, ChangeStatus, UpdateChangePayload } from '@/types/change'

export interface ChangeWorkflowAction {
  status: ChangeStatus
  label: string
  destructive?: boolean
  reasonField?: 'approvalReason' | 'failureReason'
}

interface ChangeWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  change: Change | null
  action: ChangeWorkflowAction | null
  submitting: boolean
  onSubmit: (payload: UpdateChangePayload) => void
}

const actionDescription = (change: Change, action: ChangeWorkflowAction) => {
  if (action.status === 'Scheduled') {
    const format = (value?: string) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not provided'
    return `Planned start: ${format(change.plannedStartAt)}. Planned end: ${format(change.plannedEndAt)}. Use Edit Change to adjust the schedule before confirming.`
  }
  if (action.status === 'Cancelled') return 'This will cancel the Change Request. This action cannot be reversed.'
  return `Confirm that you want to move ${change.changeId} to ${action.status}.`
}

export function ChangeWorkflowDialog({ open, onOpenChange, change, action, submitting, onSubmit }: ChangeWorkflowDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  if (!change || !action) return null
  const needsReason = Boolean(action.reasonField)
  const submit = () => {
    if (needsReason && !reason.trim()) return
    onSubmit({ status: action.status, ...(action.reasonField === 'approvalReason' ? { approvalReason: reason.trim() } : action.reasonField === 'failureReason' ? { failureReason: reason.trim() } : {}) })
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{action.label}</DialogTitle><DialogDescription>{actionDescription(change, action)}</DialogDescription></DialogHeader>{action.reasonField && <FormItem><FormLabel required>{action.reasonField === 'approvalReason' ? 'Rejection reason' : 'Failure reason'}</FormLabel><Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder={action.reasonField === 'approvalReason' ? 'Explain why this Change is rejected' : 'Explain why this Change failed'} />{needsReason && !reason.trim() && <FormMessage>A reason is required.</FormMessage>}</FormItem>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button><Button type="button" variant={action.destructive ? 'destructive' : 'default'} disabled={submitting || (needsReason && !reason.trim())} onClick={submit}>{submitting ? 'Updating…' : action.label}</Button></DialogFooter></DialogContent></Dialog>
}
