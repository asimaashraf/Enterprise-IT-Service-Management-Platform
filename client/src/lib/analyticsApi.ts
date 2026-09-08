import { isAxiosError } from 'axios'
import apiClient from '@/lib/apiClient'
import type {
  AnalyticsDateParams,
  AnalyticsEnvelope,
  IncidentTrendsAnalytics,
  SLAComplianceAnalytics,
  OperationalPerformance,
  ResolutionTimeAnalytics,
  AssetHealthAnalytics,
  ChangeSuccessRateAnalytics,
} from '@/types/analytics'

async function get<T>(
  path: string,
  range: AnalyticsDateParams,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const response = await apiClient.get<AnalyticsEnvelope<T>>(
      `/analytics/${path}`,
      {
        // Never forward arbitrary caller properties or an organization selector.
        params: range.startDate
          ? { startDate: range.startDate, endDate: range.endDate }
          : undefined,
        signal,
      },
    )
    if (!response.data.success) throw new Error(response.data.message)
    return response.data.data
  } catch (error) {
    if (
      isAxiosError<{ message?: string }>(error) &&
      typeof error.response?.data?.message === 'string'
    )
      throw new Error(error.response.data.message)
    throw error
  }
}
export const analyticsApi = {
  incidentTrends: (range: AnalyticsDateParams, signal?: AbortSignal) =>
    get<IncidentTrendsAnalytics>('incident-trends', range, signal),
  slaCompliance: (range: AnalyticsDateParams, signal?: AbortSignal) =>
    get<SLAComplianceAnalytics>('sla-compliance', range, signal),
  operationalPerformance: (range: AnalyticsDateParams, signal?: AbortSignal) =>
    get<OperationalPerformance[]>('technician-performance', range, signal),
  resolutionTime: (range: AnalyticsDateParams, signal?: AbortSignal) =>
    get<ResolutionTimeAnalytics>('resolution-time', range, signal),
  assetHealth: (range: AnalyticsDateParams, signal?: AbortSignal) =>
    get<AssetHealthAnalytics>('asset-health', range, signal),
  changeSuccessRate: (range: AnalyticsDateParams, signal?: AbortSignal) =>
    get<ChangeSuccessRateAnalytics>('change-success-rate', range, signal),
}
