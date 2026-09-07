import apiClient from '@/lib/apiClient'
import type { ApiEnvelope, AssetAuditRecord } from '@/types/asset'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

/** Admin-only, tenant-scoped audit stream. The backend has no resource filter. */
export const auditApi = {
  async list(): Promise<AssetAuditRecord[]> {
    return unwrap(await apiClient.get<ApiEnvelope<AssetAuditRecord[]>>('/audit-logs'))
  },
}
