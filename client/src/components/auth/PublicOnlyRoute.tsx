import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

import type { RootState } from '@/store'

/**
 * Route guard for the public auth pages (login, register).
 *
 * - If the user is already authenticated, redirect to the dashboard.
 * - Otherwise render the children.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { status, initialized } = useSelector((state: RootState) => state.auth)
  if (!initialized) {
    return null
  }
  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
