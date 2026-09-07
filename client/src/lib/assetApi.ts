import apiClient from '@/lib/apiClient'
import type {
  ApiEnvelope,
  Asset,
  AssetLifecycleRecord,
  AssetMaintenanceRecord,
  CreateAssetPayload,
  UpdateAssetPayload,
} from '@/types/asset'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

export const assetApi = {
  async list(): Promise<Asset[]> {
    return unwrap(await apiClient.get<ApiEnvelope<Asset[]>>('/assets'))
  },

  async get(id: string): Promise<Asset> {
    return unwrap(await apiClient.get<ApiEnvelope<Asset>>(`/assets/${id}`))
  },

  async create(payload: CreateAssetPayload): Promise<Asset> {
    return unwrap(
      await apiClient.post<ApiEnvelope<Asset>>('/assets', payload),
    )
  },

  async update(id: string, payload: UpdateAssetPayload): Promise<Asset> {
    return unwrap(
      await apiClient.put<ApiEnvelope<Asset>>(`/assets/${id}`, payload),
    )
  },

  async assign(id: string, employeeId: string): Promise<Asset> {
    return unwrap(
      await apiClient.post<ApiEnvelope<Asset>>(`/assets/${id}/assign`, {
        employeeId,
      }),
    )
  },

  async unassign(id: string): Promise<Asset> {
    return unwrap(
      await apiClient.post<ApiEnvelope<Asset>>(`/assets/${id}/unassign`),
    )
  },

  async lifecycleHistory(id: string): Promise<AssetLifecycleRecord[]> {
    return unwrap(
      await apiClient.get<ApiEnvelope<AssetLifecycleRecord[]>>(
        `/assets/${id}/lifecycle`,
      ),
    )
  },

  async maintenanceHistory(id: string): Promise<AssetMaintenanceRecord[]> {
    return unwrap(
      await apiClient.get<ApiEnvelope<AssetMaintenanceRecord[]>>(
        `/assets/${id}/maintenance`,
      ),
    )
  },
}
