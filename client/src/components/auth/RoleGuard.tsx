import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

import type { RootState } from '@/store'
import type { UserRole } from '@/types/auth'

interface RoleGuardProps {
  /** Roles that are allowed to access the wrapped content. */
  allowedRoles: UserRole[]
  children: React.ReactNode
  /**
   * Where to send users that don't have a permitted role. Defaults to
   * the dashboard root.
   */
  fallbackPath?: string
}

/**
 * Role-based route guard.
 *
 * Golden rule: client-side role protection exists only for user
 * experience and interface control. The backend must independently
 * enforce the same role-based restrictions on every mutating endpoint.
 *
 * Behaviour:
 *  - While the session is being restored, render nothing to avoid a
 *    flash of content.
 *  - Authenticated users with a permitted role render the child content.
 *  - All others (unauthenticated, or wrong role) are redirected to
 *    `fallbackPath` (default "/") and the requested path is preserved
 *    in `state.from` so the login flow can return them after sign-in.
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallbackPath = '/',
}: RoleGuardProps) {
  const { user, status, initialized } = useSelector(
    (state: RootState) => state.auth,
  )
  const location = useLocation()

  if (!initialized) {
    return null
  }

  if (status !== 'authenticated' || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: { pathname: location.pathname } }}
        replace
      />
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
