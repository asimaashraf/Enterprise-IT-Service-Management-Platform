export type ChangeType = 'Standard' | 'Normal' | 'Emergency'
export type ChangeRisk = 'Low' | 'Medium' | 'High' | 'Critical'
export type ChangeStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Scheduled' | 'In Progress' | 'Completed' | 'Failed' | 'Cancelled'

export interface ChangeUser {
  _id: string
  name: string
  email: string
  role: 'admin' | 'employee'
}

export interface ChangeAffectedAsset {
  _id: string
  assetId: string
  name: string
  category: string
  status: string
}

export interface Change {
  _id: string
  changeId: string
  title: string
  description: string
  type: ChangeType
  risk: ChangeRisk
  status: ChangeStatus
  requestedBy: ChangeUser | string
  assignedTo?: ChangeUser | string | null
  organizationId: string
  affectedAssets?: ChangeAffectedAsset[]
  plannedStartAt?: string
  plannedEndAt?: string
  rollbackPlan?: string
  approvalReason?: string
  approvedBy?: ChangeUser | string | null
  approvedAt?: string
  rejectedBy?: ChangeUser | string | null
  rejectedAt?: string
  startedAt?: string
  completedAt?: string
  failedAt?: string
  cancelledAt?: string
  failureReason?: string
  createdAt: string
  updatedAt: string
}

export interface CreateChangePayload {
  changeId: string
  title: string
  description: string
  type: ChangeType
  risk: ChangeRisk
  affectedAssets?: string[]
  plannedStartAt?: string
  plannedEndAt?: string
  rollbackPlan?: string
}

export interface UpdateChangePayload {
  title?: string
  description?: string
  type?: ChangeType
  risk?: ChangeRisk
  affectedAssets?: string[]
  plannedStartAt?: string
  plannedEndAt?: string
  rollbackPlan?: string
  assignedTo?: string
  status?: ChangeStatus
  approvalReason?: string
  failureReason?: string
}

export interface ChangeFilters {
  search: string
  type: string
  risk: string
  status: string
  [key: string]: string
}

export const changeTypes: ChangeType[] = ['Standard', 'Normal', 'Emergency']
export const changeRisks: ChangeRisk[] = ['Low', 'Medium', 'High', 'Critical']
export const changeStatuses: ChangeStatus[] = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Scheduled', 'In Progress', 'Completed', 'Failed', 'Cancelled']

export function getChangeUserId(user: ChangeUser | string | null | undefined): string | undefined {
  if (!user) return undefined
  return typeof user === 'string' ? user : user._id
}

export function getChangeUserDisplay(user: ChangeUser | string | null | undefined): string {
  if (!user) return 'Unassigned'
  return typeof user === 'string' ? user : user.name || user.email || 'Unknown'
}

export function normalizeChangeStatus(status: ChangeStatus): string {
  const statusMap: Record<ChangeStatus, string> = {
    Draft: 'secondary',
    'Pending Approval': 'pending',
    Approved: 'approved',
    Rejected: 'rejected',
    Scheduled: 'default',
    'In Progress': 'in_progress',
    Completed: 'implemented',
    Failed: 'critical',
    Cancelled: 'cancelled',
  }
  return statusMap[status]
}
