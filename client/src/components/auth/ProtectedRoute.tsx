import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { restoreSessionThunk, type AppDispatch, type RootState } from '@/store'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Guards authenticated routes.
 *
 * - While the session is being restored from storage (initial page load),
 *   renders nothing to avoid a flash of content or premature redirect.
 * - Once restored:
 *   • Authenticated → renders the child content.
 *   • Unauthenticated → redirects to /login, preserving the intended path.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { status, initialized } = useSelector((state: RootState) => state.auth)
  const location = useLocation()

  useEffect(() => {
    if (!initialized) {
      dispatch(restoreSessionThunk())
    }
  }, [dispatch, initialized])

  if (!initialized) {
    // Session restoration in progress — show nothing to prevent flash.
    return null
  }

  if (status !== 'authenticated') {
    return (
      <Navigate
        to="/login"
        state={{ from: { pathname: location.pathname } }}
        replace
      />
    )
  }

  return <>{children}</>
}
