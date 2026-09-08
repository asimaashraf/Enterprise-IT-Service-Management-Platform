import apiClient from '@/lib/apiClient'
import { unwrapSettings } from '@/lib/settingsApi'
import type { ApiEnvelope } from '@/types/auth'
import type {
  Department,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from '@/types/department'

export const departmentApi = {
  async list(signal?: AbortSignal): Promise<Department[]> {
    return unwrapSettings(
      await apiClient.get<ApiEnvelope<Department[]>>('/departments', {
        signal,
      }),
    )
  },
  async get(id: string, signal?: AbortSignal): Promise<Department> {
    return unwrapSettings(
      await apiClient.get<ApiEnvelope<Department>>(
        `/departments/${encodeURIComponent(id)}`,
        { signal },
      ),
    )
  },
  async create(payload: CreateDepartmentPayload): Promise<Department> {
    const { name, description } = payload
    return unwrapSettings(
      await apiClient.post<ApiEnvelope<Department>>('/departments', {
        name,
        description,
      }),
    )
  },
  async update(
    id: string,
    payload: UpdateDepartmentPayload,
  ): Promise<Department> {
    const { name, description, isActive } = payload
    return unwrapSettings(
      await apiClient.put<ApiEnvelope<Department>>(
        `/departments/${encodeURIComponent(id)}`,
        { name, description, isActive },
      ),
    )
  },
  async remove(id: string): Promise<Department> {
    return unwrapSettings(
      await apiClient.delete<ApiEnvelope<Department>>(
        `/departments/${encodeURIComponent(id)}`,
      ),
    )
  },
}
