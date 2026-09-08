import { useSelector } from 'react-redux'
import { store, type RootState } from '@/store'

// Observe even unmounted logout/login transitions without putting tokens in keys.
let session = 0
let previous = store.getState().auth
store.subscribe(() => {
  const next = store.getState().auth
  if (
    next.token !== previous.token ||
    next.user?.id !== previous.user?.id ||
    next.user?.organizationId !== previous.user?.organizationId ||
    next.user?.role !== previous.user?.role
  )
    session++
  previous = next
})

export function useSettingsScope() {
  const { user, token, status } = useSelector((state: RootState) => state.auth)
  const version = session
  const enabled = Boolean(
    user?.organizationId && token && status === 'authenticated',
  )
  return {
    user,
    enabled,
    isAdmin: enabled && user?.role === 'admin',
    key: [
      'settings',
      user?.organizationId ?? '',
      user?.id ?? '',
      user?.role ?? '',
      version,
    ] as const,
    isCurrent: () => session === version,
    assertAdmin: () => {
      if (session !== version || !enabled || user?.role !== 'admin')
        throw new Error('Your session changed. Please reopen this page.')
    },
  }
}

export const settingsQueryOptions = {
  gcTime: 0,
  staleTime: 0,
  refetchOnMount: 'always' as const,
  retry: false,
}
