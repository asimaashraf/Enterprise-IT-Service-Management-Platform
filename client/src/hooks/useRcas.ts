import { useSelector } from 'react-redux'
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { store, type RootState } from '@/store'
import { rcaApi, rcaProblemApi, rcaError } from '@/lib/rcaApi'
import { useUsers } from '@/hooks/useUsers'
import { incidentApi } from '@/lib/incidentApi'
import type {
  CreateRCAPayload,
  UpdateRCAPayload,
  CreateCorrectiveActionPayload,
  UpdateCorrectiveActionPayload,
} from '@/types/rca'

// Session numbers keep bearer tokens out of query keys. The subscription also
// observes logout while no RCA page is mounted, including same-account relogin.
let version = 0
let previous = store.getState().auth
store.subscribe(() => {
  const next = store.getState().auth
  if (
    next.token !== previous.token ||
    next.user?.id !== previous.user?.id ||
    next.user?.organizationId !== previous.user?.organizationId ||
    next.user?.role !== previous.user?.role
  )
    version++
  previous = next
})
export function useRcaScope() {
  const { user, token, status } = useSelector((state: RootState) => state.auth)
  return {
    user,
    enabled: Boolean(user && token && status === 'authenticated'),
    version,
    key: [
      'rca',
      user?.organizationId ?? '',
      user?.id ?? '',
      user?.role ?? '',
      version,
    ] as const,
  }
}
export const rcaKeys = {
  list: (scope: readonly unknown[]) => [...scope, 'list'] as const,
  detail: (scope: readonly unknown[], id: string) =>
    [...scope, 'detail', id] as const,
  byProblem: (scope: readonly unknown[], id?: string) =>
    id
      ? ([...scope, 'problem', id] as const)
      : ([...scope, 'problem'] as const),
  actions: (scope: readonly unknown[], id: string) =>
    [...scope, 'actions', id] as const,
  action: (scope: readonly unknown[], id: string, actionId: string) =>
    [...scope, 'actions', id, actionId] as const,
}
const queryOptions = {
  gcTime: 0,
  staleTime: 0,
  refetchOnMount: 'always' as const,
}
export function useRcaBusy() {
  const scope = useRcaScope()
  return useIsMutating({ mutationKey: scope.key }) > 0
}
export function useRcas() {
  const scope = useRcaScope()
  return useQuery({
    ...queryOptions,
    queryKey: rcaKeys.list(scope.key),
    queryFn: ({ signal }) => rcaApi.list(signal),
    enabled: scope.enabled,
  })
}
export function useRca(id: string) {
  const scope = useRcaScope()
  return useQuery({
    ...queryOptions,
    queryKey: rcaKeys.detail(scope.key, id),
    queryFn: ({ signal }) => rcaApi.get(id, signal),
    enabled: scope.enabled && Boolean(id),
  })
}
export function useRcaByProblem(id: string, enabled = true) {
  const scope = useRcaScope()
  return useQuery({
    ...queryOptions,
    queryKey: rcaKeys.byProblem(scope.key, id),
    queryFn: ({ signal }) => rcaApi.byProblem(id, signal),
    enabled: scope.enabled && Boolean(id) && enabled,
    retry: false,
  })
}
export function useRcaActions(id: string) {
  const scope = useRcaScope()
  return useQuery({
    ...queryOptions,
    queryKey: rcaKeys.actions(scope.key, id),
    queryFn: ({ signal }) => rcaApi.actions(id, signal),
    enabled: scope.enabled && Boolean(id),
  })
}
export function useRcaAction(id: string, actionId: string) {
  const scope = useRcaScope()
  return useQuery({
    ...queryOptions,
    queryKey: rcaKeys.action(scope.key, id, actionId),
    queryFn: ({ signal }) => rcaApi.action(id, actionId, signal),
    enabled: scope.enabled && Boolean(id && actionId),
  })
}
export function useRcaProblems() {
  const scope = useRcaScope()
  return useQuery({
    ...queryOptions,
    queryKey: [...scope.key, 'lookups', 'problems'],
    queryFn: ({ signal }) => rcaProblemApi.list(signal),
    enabled: scope.enabled && scope.user?.role === 'admin',
  })
}
export function useRcaIncidents() {
  const scope = useRcaScope()
  // Reuse the existing Incident API with a scoped cache instead of the legacy
  // unscoped Incident query key. No reverse link or new endpoint is introduced.
  return useQuery({
    ...queryOptions,
    queryKey: [...scope.key, 'lookups', 'incidents'],
    queryFn: incidentApi.list,
    enabled: scope.enabled && scope.user?.role === 'admin',
  })
}
export function useRcaAssignees() {
  const scope = useRcaScope()
  return useUsers(true, (users) => users.filter((user) =>
    user.isActive && user.role === 'admin' && user.organizationId === scope.user?.organizationId,
  ))
}

function useRcaMutation<T, R>(
  operation: (value: T) => Promise<R>,
  affected: (
    value: T,
    scope: readonly unknown[],
  ) => readonly (readonly unknown[])[],
  message: string,
) {
  const scope = useRcaScope()
  const client = useQueryClient()
  return useMutation({
    mutationKey: scope.key,
    mutationFn: async (value: T) => {
      if (
        !scope.enabled ||
        scope.user?.role !== 'admin' ||
        scope.version !== version
      )
        throw new Error('Your session changed. Reload before making changes.')
      const result = await operation(value)
      if (scope.version !== version)
        throw new Error('Your session changed. Reload to see the result.')
      return result
    },
    onSuccess: async (_result, value) => {
      if (scope.version !== version)
        throw new Error('Your session changed. Reload to see the result.')
      await Promise.all(
        affected(value, scope.key).map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      )
      if (scope.version !== version)
        throw new Error('Your session changed. Reload to see the result.')
      toast.success(message)
    },
    onError: (error, value) => {
      if (scope.version !== version) return
      toast.error(rcaError(error))
      // Refresh authoritative status after a conflict/approval in another tab.
      for (const queryKey of affected(value, scope.key))
        void client.invalidateQueries({ queryKey })
    },
  })
}
const rcaAffected = (id: string, scope: readonly unknown[]) => [
  rcaKeys.list(scope),
  rcaKeys.detail(scope, id),
  rcaKeys.byProblem(scope),
]
export function useCreateRca() {
  return useRcaMutation(
    (payload: CreateRCAPayload) => rcaApi.create(payload),
    (_value, scope) => [rcaKeys.list(scope), rcaKeys.byProblem(scope)],
    'RCA created',
  )
}
export function useUpdateRca() {
  return useRcaMutation(
    ({ id, payload }: { id: string; payload: UpdateRCAPayload }) =>
      rcaApi.update(id, payload),
    ({ id }, scope) => [...rcaAffected(id, scope), rcaKeys.actions(scope, id)],
    'RCA updated',
  )
}
export function useDeleteRca() {
  return useRcaMutation(
    (id: string) => rcaApi.remove(id),
    (id, scope) => [...rcaAffected(id, scope), rcaKeys.actions(scope, id)],
    'RCA deleted',
  )
}
export function useCreateRcaAction() {
  return useRcaMutation(
    ({ id, payload }: { id: string; payload: CreateCorrectiveActionPayload }) =>
      rcaApi.createAction(id, payload),
    ({ id }, scope) => [rcaKeys.actions(scope, id), rcaKeys.detail(scope, id)],
    'Corrective action created',
  )
}
export function useUpdateRcaAction() {
  return useRcaMutation(
    ({
      id,
      actionId,
      payload,
    }: {
      id: string
      actionId: string
      payload: UpdateCorrectiveActionPayload
    }) => rcaApi.updateAction(id, actionId, payload),
    ({ id }, scope) => [rcaKeys.actions(scope, id), rcaKeys.detail(scope, id)],
    'Corrective action updated',
  )
}
export function useDeleteRcaAction() {
  return useRcaMutation(
    ({ id, actionId }: { id: string; actionId: string }) =>
      rcaApi.removeAction(id, actionId),
    ({ id }, scope) => [rcaKeys.actions(scope, id), rcaKeys.detail(scope, id)],
    'Corrective action deleted',
  )
}
