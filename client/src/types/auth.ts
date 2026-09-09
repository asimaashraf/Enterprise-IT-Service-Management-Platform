// Auth types — mirror the backend contract from
// src/modules/auth/auth.service.ts (AuthResponse) and
// src/middleware/auth.middleware.ts (JWT claims).

export type UserRole = 'admin' | 'employee'

export interface EligibleOperationalAssignee {
  id: string
  name: string
  email: string
  role: 'admin'
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId: string
  /** Whether the user has verified their email address. */
  isEmailVerified?: boolean
  /** Whether the user account is active. Inactive/blocked users cannot log in. */
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthSession {
  user: AuthUser
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  organizationId: string
}

// --- Invitation types ---

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface InvitationDetail {
  id: string
  email: string
  role: UserRole
  organizationId: string
  organizationName: string
  status: InvitationStatus
  expiresAt: string
  createdAt: string
  invitedBy: { id: string; name: string; email: string } | null
}

export interface InvitationValidation {
  email: string
  role: UserRole
  organizationId: string
  organizationName: string
  expiresAt: string
}

export interface AcceptInvitePayload {
  token: string
  name: string
  password: string
}

// --- User management types ---

export interface UserListItem {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId: string
  isEmailVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateUserProfilePayload {
  name: string
  email: string
}

// --- API envelope ---

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
}

export interface ApiError {
  success: false
  message: string
}

export interface MessageResponse {
  message: string
}
