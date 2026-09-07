import apiClient from '@/lib/apiClient'
import type { ApiEnvelope } from '@/types/auth'
import type {
  CreateSupportTeamPayload,
  SupportTeam,
  UpdateSupportTeamPayload,
} from '@/types/supportTeam'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

/**
 * Support Team administration API. The backend derives tenant scope from the
 * authenticated user and remains the authority for membership eligibility.
 */
export const supportTeamApi = {
  async list(): Promise<SupportTeam[]> {
    const response = await apiClient.get<ApiEnvelope<SupportTeam[]>>(
      '/support-teams',
    )
    return unwrap<SupportTeam[]>(response)
  },

  async create(payload: CreateSupportTeamPayload): Promise<SupportTeam> {
    const response = await apiClient.post<ApiEnvelope<SupportTeam>>(
      '/support-teams',
      payload,
    )
    return unwrap<SupportTeam>(response)
  },

  async update(
    id: string,
    payload: UpdateSupportTeamPayload,
  ): Promise<SupportTeam> {
    const response = await apiClient.put<ApiEnvelope<SupportTeam>>(
      `/support-teams/${id}`,
      payload,
    )
    return unwrap<SupportTeam>(response)
  },

  async remove(id: string): Promise<SupportTeam> {
    const response = await apiClient.delete<ApiEnvelope<SupportTeam>>(
      `/support-teams/${id}`,
    )
    return unwrap<SupportTeam>(response)
  },
}
