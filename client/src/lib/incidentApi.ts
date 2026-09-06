import apiClient from '@/lib/apiClient'
import type {
  Incident,
  CreateIncidentPayload,
  UpdateIncidentPayload,
  ApiEnvelope,
} from '@/types/incident'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

export const incidentApi = {
  /**
   * List all incidents for the authenticated user's organization.
   * Backend handles tenant isolation via JWT claims.
   */
  async list(): Promise<Incident[]> {
    const response = await apiClient.get<ApiEnvelope<Incident[]>>('/incidents')
    return unwrap<Incident[]>(response)
  },

  /**
   * Get a single incident by its MongoDB _id.
   */
  async get(id: string): Promise<Incident> {
    const response = await apiClient.get<ApiEnvelope<Incident>>(`/incidents/${id}`)
    return unwrap<Incident>(response)
  },

  /**
   * Create a new incident.
   * Backend sets reportedBy from the JWT and determines initial assignment automatically.
   */
  async create(payload: CreateIncidentPayload): Promise<Incident> {
    const response = await apiClient.post<ApiEnvelope<Incident>>('/incidents', payload)
    return unwrap<Incident>(response)
  },

  /**
   * Update an existing incident.
   * Authorization rules:
   * - Admins: unrestricted
   * - Employees: can only update status (In Progress / Resolved) and resolution;
   *   cannot change assignment, priority, severity, or title/description.
   *   Must be the assigned employee.
   */
  async update(id: string, payload: UpdateIncidentPayload): Promise<Incident> {
    const response = await apiClient.put<ApiEnvelope<Incident>>(`/incidents/${id}`, payload)
    return unwrap<Incident>(response)
  },

  /**
   * Delete an incident. Admin only.
   */
  async delete(id: string): Promise<Incident> {
    const response = await apiClient.delete<ApiEnvelope<Incident>>(`/incidents/${id}`)
    return unwrap<Incident>(response)
  },

  /**
   * Export incident as PDF. Streamed response — returns the raw Blob.
   */
  async exportPdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`/incidents/${id}/pdf`, {
      responseType: 'blob',
    })
    return response.data as Blob
  },
}
