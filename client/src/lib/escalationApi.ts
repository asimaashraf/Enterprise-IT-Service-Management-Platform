import apiClient from '@/lib/apiClient'
import type { EscalationPolicy, IncidentPriority, ApiEnvelope } from '@/types/incident'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

/**
 * Escalation policy API — mirrors backend routes at
 * /api/v1/incident-escalation.
 */
export const escalationApi = {
  /**
   * List all escalation policies for the current organization.
   */
  async list(): Promise<EscalationPolicy[]> {
    const response = await apiClient.get<ApiEnvelope<EscalationPolicy[]>>('/incident-escalation')
    return unwrap<EscalationPolicy[]>(response)
  },

  /**
   * Get escalation policies applicable to a given priority.
   * Returns policies ordered by threshold (earliest fires first).
   */
  async getApplicable(priority: IncidentPriority): Promise<EscalationPolicy[]> {
    const response = await apiClient.get<ApiEnvelope<EscalationPolicy[]>>(
      `/incident-escalation/applicable/${encodeURIComponent(priority)}`,
    )
    return unwrap<EscalationPolicy[]>(response)
  },
}
