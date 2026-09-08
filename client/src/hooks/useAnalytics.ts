import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { store, type RootState } from '@/store'
import { analyticsApi } from '@/lib/analyticsApi'
import type { AnalyticsDateParams } from '@/types/analytics'

// Match the existing RCA session pattern without tying analytics to RCA queries.
let session = 0
let previous = store.getState().auth
store.subscribe(() => {
  const next = store.getState().auth
  if (
    next.token !== previous.token ||
    next.user?.id !== previous.user?.id ||
    next.user?.organizationId !== previous.user?.organizationId ||
    next.user?.role !== previous.user?.role
  )
    session++
  previous = next
})
export function useAnalyticsScope() {
  const { user, token, status } = useSelector((state: RootState) => state.auth)
  return {
    key: [
      'analytics',
      user?.organizationId ?? '',
      user?.id ?? '',
      user?.role ?? '',
      session,
    ] as const,
    enabled: Boolean(user && token && status === 'authenticated'),
  }
}
function useMetric<T>(
  name: string,
  range: AnalyticsDateParams,
  fetch: (range: AnalyticsDateParams, signal?: AbortSignal) => Promise<T>,
) {
  const scope = useAnalyticsScope()
  return useQuery({
    queryKey: [...scope.key, name, range.startDate ?? '', range.endDate ?? ''],
    queryFn: ({ signal }) => fetch(range, signal),
    enabled: scope.enabled,
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
  })
}
export const useIncidentTrends = (range: AnalyticsDateParams) =>
  useMetric('incident-trends', range, analyticsApi.incidentTrends)
export const useSlaCompliance = (range: AnalyticsDateParams) =>
  useMetric('sla-compliance', range, analyticsApi.slaCompliance)
export const useOperationalPerformance = (range: AnalyticsDateParams) =>
  useMetric(
    'operational-performance',
    range,
    analyticsApi.operationalPerformance,
  )
export const useResolutionTime = (range: AnalyticsDateParams) =>
  useMetric('resolution-time', range, analyticsApi.resolutionTime)
export const useAssetHealth = (range: AnalyticsDateParams) =>
  useMetric('asset-health', range, analyticsApi.assetHealth)
export const useChangeSuccessRate = (range: AnalyticsDateParams) =>
  useMetric('change-success-rate', range, analyticsApi.changeSuccessRate)
export function useAnalytics(range: AnalyticsDateParams) {
  return {
    incidents: useIncidentTrends(range),
    sla: useSlaCompliance(range),
    performance: useOperationalPerformance(range),
    resolution: useResolutionTime(range),
    assets: useAssetHealth(range),
    changes: useChangeSuccessRate(range),
  }
}
