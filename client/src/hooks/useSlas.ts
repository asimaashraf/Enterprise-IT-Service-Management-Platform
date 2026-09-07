import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { slaApi } from '@/lib/slaApi'
import type { CreateSLAPayload } from '@/types/sla'

export const slaKeys = {
  all: ['slas'] as const,
  byIncident: (incidentId: string) => ['slas', 'incident', incidentId] as const,
}

export function useSlas() {
  return useQuery({ queryKey: slaKeys.all, queryFn: slaApi.list })
}

export function useSLAForIncident(incidentId: string, enabled = true) {
  return useQuery({
    queryKey: slaKeys.byIncident(incidentId),
    queryFn: () => slaApi.getByIncident(incidentId),
    enabled: Boolean(incidentId) && enabled,
  })
}

export function useCreateSLA(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSLAPayload) => slaApi.create(payload),
    onSuccess: (sla) => {
      queryClient.invalidateQueries({ queryKey: slaKeys.all })
      const incidentId = typeof sla.incidentId === 'string' ? sla.incidentId : sla.incidentId._id
      queryClient.setQueryData(slaKeys.byIncident(incidentId), sla)
      toast.success('SLA configured')
      options?.onSuccess?.()
    },
    onError: (error: Error) =>
      toast.error('Failed to configure SLA', { description: error.message }),
  })
}

