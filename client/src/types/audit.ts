import type { UserRole } from '@/types/auth'

export type AuditOutcome = 'Success' | 'Failure'
export type AuditJsonValue =
  | string
  | number
  | boolean
  | null
  | AuditJsonValue[]
  | { [key: string]: AuditJsonValue }

/** Serialized tenant audit record. Actor fields are snapshots, not populated users. */
export interface AuditLogRecord {
  _id: string
  actorId?: string | null
  actorEmail?: string | null
  actorRole?: UserRole | null
  organizationId: string
  action: string
  eventType: string
  resourceType: string
  resourceId?: string | null
  outcome: AuditOutcome
  metadata?: AuditJsonValue
  createdAt: string
}

export interface AuditFilters {
  search: string
  outcome: '' | AuditOutcome
  resourceType: string
  actorRole: '' | UserRole
}
