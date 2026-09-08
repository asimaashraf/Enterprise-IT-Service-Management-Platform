export interface OperationalPerformance {
  technicianId: string
  technicianName: string
  email: string

  totalAssigned: number
  openIncidents: number
  inProgressIncidents: number
  resolvedIncidents: number
  closedIncidents: number

  totalResolvedOrClosed: number
  resolutionRate: number

  averageResolutionTimeHours: number | null
}

export interface IncidentTrendsAnalytics {
  totalIncidents: number
  open: number
  inProgress: number
  pending: number
  resolved: number
  closed: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  bySeverity: Record<string, number>
  trend: Array<{ date: string; count: number }>
}

export interface SLAComplianceAnalytics {
  totalSLAs: number
  active: number
  completed: number
  responseBreached: number
  resolutionBreached: number
  totalBreached: number
  compliant: number
  complianceRate: number
  byPriority: Record<string, number>
  byStatus: Record<string, number>
}

export interface ResolutionTimeAnalytics {
  totalResolvedIncidents: number
  averageResolutionHours: number | null
  medianResolutionHours: number | null
  byPriority: Record<string, number>
}

export interface AssetHealthAnalytics {
  totalAssets: number

  available: number
  assigned: number
  maintenance: number
  retired: number

  activeAssets: number
  healthyAssets: number

  warrantyAlerts: number
  maintenanceAlerts: number
  lifecycleAlerts: number

  healthRate: number
  maintenanceRate: number
  retiredRate: number
}

export interface ChangeSuccessRateAnalytics {
  totalChanges: number

  completed: number
  failed: number
  cancelled: number

  successfulChanges: number
  unsuccessfulChanges: number
  evaluatedChanges: number
  unevaluatedChanges: number

  successRate: number
  failureRate: number
}

export type AnalyticsDateParams =
  | { startDate: string; endDate: string }
  | { startDate?: never; endDate?: never }
export type AnalyticsEnvelope<T> =
  { success: true; data: T } | { success: false; message: string }
