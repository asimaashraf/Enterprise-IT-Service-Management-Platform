import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { restoreSessionThunk, type AppDispatch, type RootState } from '@/store'

/**
 * Bootstraps the application by restoring any persisted session.
 *
 * While the session is being rehydrated, the app renders nothing
 * to avoid a flash of unauthenticated UI. Once `initialized` is true
 * we render the children (the <Routes> tree).
 */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const { initialized } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!initialized) {
      dispatch(restoreSessionThunk())
    }
  }, [dispatch, initialized])

  if (!initialized) {
    return null
  }
  return <>{children}</>
}
