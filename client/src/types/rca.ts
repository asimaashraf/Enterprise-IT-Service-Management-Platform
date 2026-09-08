import type { UserRole } from '@/types/auth'

export const rcaStatuses = [
  'Draft',
  'Under Investigation',
  'Completed',
  'Approved',
] as const
export type RCAStatus = (typeof rcaStatuses)[number]
export const correctiveActionStatuses = [
  'Pending',
  'In Progress',
  'Completed',
  'Cancelled',
] as const
export type CorrectiveActionStatus = (typeof correctiveActionStatuses)[number]
export type RCAReference<T> = T | string | null | undefined

export interface RCAUserReference {
  _id: string
  name?: string
  email?: string
  role?: UserRole
}
export interface RCAProblemReference {
  _id: string
  problemId?: string
  title?: string
  description?: string
  priority?: string
  impact?: string
  urgency?: string
  status?: string
  rootCause?: string
}
export interface RCAIncidentReference {
  _id: string
  incidentId?: string
  title?: string
  description?: string
  priority?: string
  severity?: string
  status?: string
  resolution?: string
}
export interface RCA {
  _id: string
  rcaId: string
  organizationId: string
  status: RCAStatus
  problem: RCAReference<RCAProblemReference>
  rootCause: string
  investigation: string
  contributingFactors: string[]
  correctiveActions: string[]
  preventiveActions: string[]
  lessonsLearned: string[]
  identifiedBy: RCAReference<RCAUserReference>
  relatedIncidents: RCAReference<RCAIncidentReference>[]
  createdAt: string
  updatedAt: string
}
export interface CorrectiveActionRCAReference {
  _id: string
  rcaId?: string
  status?: RCAStatus
  problem?: string | null
  rootCause?: string
}
export interface CorrectiveAction {
  _id: string
  rca: RCAReference<CorrectiveActionRCAReference>
  organizationId: string
  title: string
  description: string
  assignedTo: RCAReference<RCAUserReference>
  createdBy: RCAReference<RCAUserReference>
  dueDate: string
  status: CorrectiveActionStatus
  completedAt?: string
  createdAt: string
  updatedAt: string
}
export interface RCABusinessFields {
  problem: string
  rootCause: string
  investigation: string
  contributingFactors?: string[]
  correctiveActions?: string[]
  preventiveActions?: string[]
  lessonsLearned?: string[]
  relatedIncidents?: string[]
}
export interface CreateRCAPayload extends RCABusinessFields {
  rcaId: string
  status?: 'Draft'
}
export type UpdateRCAPayload = Partial<RCABusinessFields> & {
  status?: RCAStatus
}
export interface CreateCorrectiveActionPayload {
  title: string
  description: string
  assignedTo: string
  dueDate: string
}
export type UpdateCorrectiveActionPayload =
  Partial<CreateCorrectiveActionPayload> & { status?: CorrectiveActionStatus }
export type RCAApiEnvelope<T> =
  | { success: true; data: T; message?: string; count?: number }
  | { success: false; message: string }
export type RCAListEnvelope<T> =
  | { success: true; count: number; data: T[] }
  | { success: false; message: string }

export const rcaTransitions: Record<RCAStatus, readonly RCAStatus[]> = {
  Draft: ['Under Investigation', 'Completed'],
  'Under Investigation': ['Draft', 'Completed'],
  Completed: ['Under Investigation', 'Approved'],
  Approved: [],
}
export function referenceId(value: RCAReference<{ _id: string }>): string {
  return typeof value === 'string' ? value : (value?._id ?? '')
}
export function problemLabel(value: RCAReference<RCAProblemReference>): string {
  if (!value) return 'Problem unavailable'
  if (typeof value === 'string') return value
  return [value.problemId || value._id, value.title].filter(Boolean).join(' — ')
}
export function userLabel(value: RCAReference<RCAUserReference>): string {
  if (!value) return 'User unavailable'
  return typeof value === 'string'
    ? value
    : value.name || value.email || value._id
}
export function rcaStatusVariant(
  status: RCAStatus | CorrectiveActionStatus,
): string {
  return {
    Draft: 'secondary',
    'Under Investigation': 'in_progress',
    Completed: 'resolved',
    Approved: 'approved',
    Pending: 'pending',
    'In Progress': 'in_progress',
    Cancelled: 'cancelled',
  }[status]
}
export function rcaDate(value?: string): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString()
}
