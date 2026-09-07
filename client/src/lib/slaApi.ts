import apiClient from '@/lib/apiClient'
import type { ApiEnvelope } from '@/types/incident'
import type { CreateSLAPayload, SLA } from '@/types/sla'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

export const slaApi = {
  async list(): Promise<SLA[]> {
    return unwrap(await apiClient.get<ApiEnvelope<SLA[]>>('/slas'))
  },

  async getByIncident(incidentId: string): Promise<SLA> {
    return unwrap(await apiClient.get<ApiEnvelope<SLA>>(`/slas/incidents/${incidentId}`))
  },

  async create(payload: CreateSLAPayload): Promise<SLA> {
    return unwrap(
      await apiClient.post<ApiEnvelope<SLA>>(
        `/slas/incidents/${payload.incidentId}`,
        { businessHours: payload.businessHours },
      ),
    )
  },
}

