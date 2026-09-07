import apiClient from '@/lib/apiClient'
import type {
  ApiEnvelope,
  UserListItem,
  UserRole,
  EligibleOperationalAssignee,
  InvitationDetail,
  InvitationValidation,
} from '@/types/auth'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

/**
 * Admin-only user management API. All endpoints derive their
 * organizationId from the authenticated admin's JWT — the browser
 * never supplies one.
 */
export const userApi = {
  async list(): Promise<UserListItem[]> {
    const response = await apiClient.get<ApiEnvelope<UserListItem[]>>(
      '/users',
    )
    return unwrap<UserListItem[]>(response)
  },

  async eligibleAssignees(): Promise<EligibleOperationalAssignee[]> {
    const response = await apiClient.get<ApiEnvelope<EligibleOperationalAssignee[]>>(
      '/users/eligible-assignees',
    )
    return unwrap<EligibleOperationalAssignee[]>(response)
  },

  async activate(id: string): Promise<UserListItem> {
    const response = await apiClient.patch<ApiEnvelope<UserListItem>>(
      `/users/${id}/activate`,
    )
    return unwrap<UserListItem>(response)
  },

  async deactivate(id: string): Promise<UserListItem> {
    const response = await apiClient.patch<ApiEnvelope<UserListItem>>(
      `/users/${id}/deactivate`,
    )
    return unwrap<UserListItem>(response)
  },

  async block(id: string): Promise<UserListItem> {
    const response = await apiClient.patch<ApiEnvelope<UserListItem>>(
      `/users/${id}/block`,
    )
    return unwrap<UserListItem>(response)
  },

  async changeRole(id: string, role: UserRole): Promise<UserListItem> {
    const response = await apiClient.patch<ApiEnvelope<UserListItem>>(
      `/users/${id}/role`,
      { role },
    )
    return unwrap<UserListItem>(response)
  },
}

/**
 * Invitation API.
 *
 * - Admin operations (create/list/revoke) require an admin JWT.
 * - Public validate/accept endpoints rely on a cryptographically-secure
 *   invitation token. The organizationId is NEVER accepted from the
 *   browser.
 */
export const invitationApi = {
  async list(): Promise<InvitationDetail[]> {
    const response = await apiClient.get<ApiEnvelope<InvitationDetail[]>>(
      '/invitations',
    )
    return unwrap<InvitationDetail[]>(response)
  },

  async create(email: string, role: UserRole = 'employee'): Promise<InvitationDetail> {
    const response = await apiClient.post<ApiEnvelope<InvitationDetail>>(
      '/invitations',
      { email, role },
    )
    return unwrap<InvitationDetail>(response)
  },

  async revoke(id: string): Promise<InvitationDetail> {
    const response = await apiClient.delete<ApiEnvelope<InvitationDetail>>(
      `/invitations/${id}`,
    )
    return unwrap<InvitationDetail>(response)
  },

  async validate(token: string): Promise<InvitationValidation> {
    const response = await apiClient.get<ApiEnvelope<InvitationValidation>>(
      `/invitations/validate`,
      { params: { token } },
    )
    return unwrap<InvitationValidation>(response)
  },

  async accept(payload: {
    token: string
    name: string
    password: string
  }): Promise<{
    user: {
      id: string
      name: string
      email: string
      role: UserRole
      organizationId: string
    }
    organizationName: string
  }> {
    const response = await apiClient.post<
      ApiEnvelope<{
        user: {
          id: string
          name: string
          email: string
          role: UserRole
          organizationId: string
        }
        organizationName: string
      }>
    >('/invitations/accept', payload)
    return unwrap(response)
  },
}
