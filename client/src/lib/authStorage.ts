import type { AuthSession, AuthUser } from '@/types/auth'

const TOKEN_KEY = 'itsm.auth.token'
const USER_KEY = 'itsm.auth.user'

export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(TOKEN_KEY)
  },

  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  },

  setSession(session: AuthSession): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(TOKEN_KEY, session.token)
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  },

  clear(): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
  },
}
