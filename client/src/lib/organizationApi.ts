import apiClient from '@/lib/apiClient'
import { unwrapSettings } from '@/lib/settingsApi'
import type { ApiEnvelope } from '@/types/auth'
import type {
  Organization,
  UpdateOrganizationPayload,
} from '@/types/organization'

export const organizationApi = {
  async list(signal?: AbortSignal): Promise<Organization[]> {
    return unwrapSettings(
      await apiClient.get<ApiEnvelope<Organization[]>>('/organizations', {
        signal,
      }),
    )
  },
  async get(id: string, signal?: AbortSignal): Promise<Organization> {
    return unwrapSettings(
      await apiClient.get<ApiEnvelope<Organization>>(
        `/organizations/${encodeURIComponent(id)}`,
        { signal },
      ),
    )
  },
  async update(
    id: string,
    payload: UpdateOrganizationPayload,
  ): Promise<Organization> {
    // Explicit allowlist: never serialize a resource object or tenant metadata.
    const { name, slug, description } = payload
    return unwrapSettings(
      await apiClient.put<ApiEnvelope<Organization>>(
        `/organizations/${encodeURIComponent(id)}`,
        { name, slug, description },
      ),
    )
  },
}
