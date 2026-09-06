// Incident types — mirror the backend contract from
// src/modules/incident/incident.model.ts

export type IncidentPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type IncidentSeverity = 'Minor' | 'Major' | 'Critical'
export type IncidentStatus = 'Open' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed'

export interface IncidentReporter {
  _id: string
  name: string
  email: string
  role: string
}

export interface IncidentAssignee {
  _id: string
  name: string
  email: string
  role: string
}

export interface Incident {
  _id: string
  incidentId: string
  title: string
  description: string
  priority: IncidentPriority
  severity: IncidentSeverity
  status: IncidentStatus
  reportedBy: IncidentReporter | string
  assignedTo?: IncidentAssignee | string | null
  organizationId: string
  resolution?: string
  resolvedAt?: string
  closedAt?: string
  createdAt: string
  updatedAt: string
}

// API envelope
export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
}

// Create payload (excludes server-managed fields)
export interface CreateIncidentPayload {
  title: string
  description: string
  priority?: IncidentPriority
  severity?: IncidentSeverity
}

// Update payload
export interface UpdateIncidentPayload {
  title?: string
  description?: string
  priority?: IncidentPriority
  severity?: IncidentSeverity
  status?: IncidentStatus
  assignedTo?: string | null
  resolution?: string
}

// Filter state
export interface IncidentFilters {
  search: string
  status: string
  priority: string
  severity: string
  [key: string]: string
}

// Normalize a populated or string user reference
export function getUserDisplay(user: IncidentReporter | IncidentAssignee | string | undefined | null): string {
  if (!user) return 'Unassigned'
  if (typeof user === 'string') return user
  return user.name || user.email || 'Unknown'
}

export function getUserId(user: IncidentReporter | IncidentAssignee | string | undefined | null): string | undefined {
  if (!user) return undefined
  if (typeof user === 'string') return user
  return user._id
}

// Normalize incident status to a StatusBadge variant key
export function normalizeStatusVariant(status: IncidentStatus | string): string {
  switch (status) {
    case 'Open': return 'open'
    case 'In Progress': return 'in_progress'
    case 'Pending': return 'pending'
    case 'Resolved': return 'resolved'
    case 'Closed': return 'closed'
    default: return 'default'
  }
}

// Normalize priority to a StatusBadge variant key
export function normalizePriorityVariant(priority: IncidentPriority | string): string {
  switch (priority) {
    case 'Critical': return 'critical'
    case 'High': return 'high'
    case 'Medium': return 'medium'
    case 'Low': return 'low'
    default: return 'default'
  }
}

// Normalize severity to a StatusBadge variant key
export function normalizeSeverityVariant(severity: IncidentSeverity | string): string {
  switch (severity) {
    case 'Critical': return 'critical'
    case 'Major': return 'high'
    case 'Minor': return 'low'
    default: return 'default'
  }
}

// ==========================================
// Escalation Policy (mirrors backend)
// ==========================================

export type EscalationLevel = 'Level 1' | 'Level 2' | 'Level 3'
export type EscalationTargetType = 'User' | 'SupportTeam'

export interface EscalationPolicy {
  _id: string
  name: string
  description?: string
  organizationId: string
  priority: IncidentPriority
  escalationLevel: EscalationLevel
  thresholdMinutes: number
  targetType: EscalationTargetType
  targetUser?: {
    _id: string
    name: string
    email: string
  }
  targetTeam?: {
    _id: string
    name: string
  }
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ==========================================
// Employee option (for assignment dropdowns)
// ==========================================

export interface EmployeeOption {
  id: string
  name: string
  email: string
}
