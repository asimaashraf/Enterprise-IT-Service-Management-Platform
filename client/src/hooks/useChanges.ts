import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

import { changeApi } from '@/lib/changeApi'
import type { RootState } from '@/store'
import type { CreateChangePayload, UpdateChangePayload } from '@/types/change'

export const changeKeys = {
  all: (organizationId: string, userId: string) => ['changes', organizationId, userId] as const,
  detail: (organizationId: string, userId: string, id: string) => ['changes', organizationId, userId, id] as const,
}

function useChangeQueryScope() {
  const user = useSelector((state: RootState) => state.auth.user)
  return user ? { organizationId: user.organizationId, userId: user.id } : undefined
}

export function useChanges() {
  const scope = useChangeQueryScope()
  return useQuery({
    queryKey: scope ? changeKeys.all(scope.organizationId, scope.userId) : ['changes', 'unauthenticated'] as const,
    queryFn: changeApi.list,
    enabled: Boolean(scope),
  })
}

export function useChange(id: string, enabled = true) {
  const scope = useChangeQueryScope()
  return useQuery({
    queryKey: scope ? changeKeys.detail(scope.organizationId, scope.userId, id) : ['changes', 'unauthenticated', id] as const,
    queryFn: () => changeApi.get(id),
    enabled: Boolean(scope && id) && enabled,
  })
}

function useChangeMutation<T>(
  mutationFn: (value: T) => Promise<ChangeResult>,
  successMessage: (changeId: string) => string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (change) => {
      queryClient.invalidateQueries({ queryKey: ['changes'] })
      toast.success(successMessage(change.changeId))
    },
    onError: (error: Error) => toast.error('Change action failed', { description: error.message }),
  })
}

type ChangeResult = { _id: string; changeId: string }

export function useCreateChange() {
  return useChangeMutation(
    (payload: CreateChangePayload) => changeApi.create(payload),
    (changeId) => `Change ${changeId} created`,
  )
}

export function useUpdateChange() {
  return useChangeMutation(
    ({ id, payload }: { id: string; payload: UpdateChangePayload }) => changeApi.update(id, payload),
    (changeId) => `Change ${changeId} updated`,
  )
}
