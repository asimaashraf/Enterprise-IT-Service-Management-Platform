import apiClient from '@/lib/apiClient'
import type { ApiEnvelope } from '@/types/auth'
import type { Change, CreateChangePayload, UpdateChangePayload } from '@/types/change'

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => {
  const envelope = response.data
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

export const changeApi = {
  async list(): Promise<Change[]> {
    return unwrap(await apiClient.get<ApiEnvelope<Change[]>>('/changes'))
  },

  async get(id: string): Promise<Change> {
    return unwrap(await apiClient.get<ApiEnvelope<Change>>(`/changes/${id}`))
  },

  async create(payload: CreateChangePayload): Promise<Change> {
    return unwrap(await apiClient.post<ApiEnvelope<Change>>('/changes', payload))
  },

  async update(id: string, payload: UpdateChangePayload): Promise<Change> {
    return unwrap(await apiClient.put<ApiEnvelope<Change>>(`/changes/${id}`, payload))
  },
}
