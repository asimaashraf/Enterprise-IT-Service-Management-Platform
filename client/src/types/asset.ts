export type AssetCategory =
  | 'Laptop'
  | 'Desktop'
  | 'Server'
  | 'Switch'
  | 'Router'
  | 'License'
  | 'Mobile Device'

export type AssetStatus =
  | 'Available'
  | 'Assigned'
  | 'Maintenance'
  | 'Retired'

export type WarrantyStatus = 'Active' | 'Expired' | 'Not Covered' | 'Not Started'

export interface AssetAssignee {
  _id: string
  name: string
  email: string
  role: 'employee'
}

export interface AssetActor {
  _id: string
  name?: string
  email?: string
  role?: 'admin' | 'employee'
}

export interface Asset {
  _id: string
  assetId: string
  name: string
  category: AssetCategory
  description?: string
  status: AssetStatus
  purchaseDate?: string
  purchasePrice?: number
  warrantyProvider?: string
  warrantyStartDate?: string
  warrantyEndDate?: string
  warrantyStatus?: WarrantyStatus
  assignedTo?: AssetAssignee | string | null
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface CreateAssetPayload {
  assetId: string
  name: string
  category: AssetCategory
  description?: string
  purchaseDate?: string
  purchasePrice?: number
  warrantyProvider?: string
  warrantyStartDate?: string
  warrantyEndDate?: string
}

export interface UpdateAssetPayload {
  name?: string
  category?: AssetCategory
  description?: string
  purchaseDate?: string
  purchasePrice?: number
  warrantyProvider?: string
  warrantyStartDate?: string
  warrantyEndDate?: string
  status?: AssetStatus
}

export interface AssetLifecycleRecord {
  _id: string
  assetId: string
  organizationId: string
  previousStatus: AssetStatus
  newStatus: AssetStatus
  changedAt: string
  changedBy?: AssetActor | string | null
}

export type AssetMaintenanceType =
  | 'Preventive'
  | 'Corrective'
  | 'Inspection'
  | 'Upgrade'

export type AssetMaintenanceStatus =
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'

export interface AssetMaintenanceRecord {
  _id: string
  assetId: string
  organizationId: string
  date: string
  type: AssetMaintenanceType
  description: string
  cost?: number
  status: AssetMaintenanceStatus
  createdBy?: AssetActor | string | null
  createdAt: string
  updatedAt: string
}

export type { AuditLogRecord as AssetAuditRecord } from '@/types/audit'

export interface AssetFilters {
  search: string
  category: string
  status: string
  [key: string]: string
}

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
}

export function getAssetAssigneeDisplay(
  assignee: AssetAssignee | string | null | undefined,
): string {
  if (!assignee) return 'Unassigned'
  return typeof assignee === 'string'
    ? assignee
    : assignee.name || assignee.email || 'Unknown'
}

export function getAssetAssigneeId(
  assignee: AssetAssignee | string | null | undefined,
): string | undefined {
  if (!assignee) return undefined
  return typeof assignee === 'string' ? assignee : assignee._id
}

export function normalizeAssetStatus(status: AssetStatus): string {
  return status.toLowerCase()
}

export function getAssetActorDisplay(
  actor: AssetActor | string | null | undefined,
): string {
  if (!actor) return 'System or unavailable'
  return typeof actor === 'string' ? actor : actor.name || actor.email || 'Unknown'
}
