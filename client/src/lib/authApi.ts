import apiClient from '@/lib/apiClient'
import type {
  ApiEnvelope,
  AuthSession,
  AuthUser,
  LoginCredentials,
  RegisterPayload,
} from '@/types/auth'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

const unwrapMessage = (response: { data: unknown }): string => {
  const envelope = response.data as ApiEnvelope<unknown>
  if (!envelope.success) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.message ?? 'Success'
}

/**
 * Auth API layer.
 *
 * Endpoints:
 * - POST /auth/register          (public; creates employee only)
 * - POST /auth/login             (public; requires verified email)
 * - GET  /auth/me                (authenticated; returns JWT claims)
 * - POST /auth/verify-email      (public; body: { token })
 * - POST /auth/resend-verification (public; body: { email })
 * - POST /auth/forgot-password   (public; body: { email })
 * - POST /auth/reset-password    (public; body: { token, password })
 *
 * The backend does not expose a logout endpoint, so logout is handled
 * client-side (clear the local token) — see authSlice.logoutThunk.
 */
export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const response = await apiClient.post<ApiEnvelope<AuthSession>>(
      '/auth/login',
      credentials,
    )
    return unwrap<AuthSession>(response)
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const response = await apiClient.post<ApiEnvelope<AuthSession>>(
      '/auth/register',
      payload,
    )
    return unwrap<AuthSession>(response)
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await apiClient.get<ApiEnvelope<AuthUser>>('/auth/me')
    return unwrap<AuthUser>(response)
  },

  async verifyEmail(token: string): Promise<string> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      '/auth/verify-email',
      { token },
    )
    return unwrapMessage(response)
  },

  async resendVerification(email: string): Promise<string> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      '/auth/resend-verification',
      { email },
    )
    return unwrapMessage(response)
  },

  async forgotPassword(email: string): Promise<string> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      '/auth/forgot-password',
      { email },
    )
    return unwrapMessage(response)
  },

  async resetPassword(token: string, password: string): Promise<string> {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      '/auth/reset-password',
      { token, password },
    )
    return unwrapMessage(response)
  },
}
