import type { IncidentPriority } from '@/types/incident'

export type SLAStatus =
  | 'Active'
  | 'Response Breached'
  | 'Resolution Breached'
  | 'Completed'

export interface SLABusinessHours {
  timezone: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  workingDays: number[]
}

export interface SLAIncidentSummary {
  _id: string
  incidentId: string
  title: string
  priority: IncidentPriority
  severity: string
  status: string
}

export interface SLA {
  _id: string
  incidentId: SLAIncidentSummary | string
  organizationId: string
  priority: IncidentPriority
  responseTimeMinutes: number
  resolutionTimeMinutes: number
  responseDueAt: string
  resolutionDueAt: string
  respondedAt?: string
  resolvedAt?: string
  status: SLAStatus
  responseBreached: boolean
  resolutionBreached: boolean
  businessHours: SLABusinessHours
  createdAt: string
  updatedAt: string
}

export interface CreateSLAPayload {
  incidentId: string
  businessHours: {
    startTime: string
    endTime: string
    timezone: string
    workingDays: number[]
  }
}

export const slaTargetsByPriority: Record<
  IncidentPriority,
  { responseTimeMinutes: number; resolutionTimeMinutes: number }
> = {
  Critical: { responseTimeMinutes: 15, resolutionTimeMinutes: 120 },
  High: { responseTimeMinutes: 30, resolutionTimeMinutes: 240 },
  Medium: { responseTimeMinutes: 120, resolutionTimeMinutes: 480 },
  Low: { responseTimeMinutes: 240, resolutionTimeMinutes: 1440 },
}

export const getSLAIncident = (incident: SLA['incidentId']) =>
  typeof incident === 'string' ? undefined : incident

