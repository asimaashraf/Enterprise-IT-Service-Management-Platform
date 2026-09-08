import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  useSettingsScope,
  settingsQueryOptions,
} from '@/hooks/useSettingsScope'
import { departmentApi } from '@/lib/departmentApi'
import { settingsError } from '@/lib/settingsApi'
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from '@/types/department'

export function useDepartments() {
  const scope = useSettingsScope()
  return useQuery({
    ...settingsQueryOptions,
    queryKey: [...scope.key, 'departments', 'list'],
    queryFn: ({ signal }) => departmentApi.list(signal),
    enabled: scope.isAdmin,
  })
}

export function useDepartment(id: string) {
  const scope = useSettingsScope()
  return useQuery({
    ...settingsQueryOptions,
    queryKey: [...scope.key, 'departments', 'detail', id],
    queryFn: ({ signal }) => departmentApi.get(id, signal),
    enabled: scope.isAdmin && Boolean(id),
  })
}

type DepartmentAction =
  | { kind: 'create'; payload: CreateDepartmentPayload }
  | { kind: 'update'; id: string; payload: UpdateDepartmentPayload }
  | { kind: 'delete'; id: string }

export function useDepartmentMutation(onSuccess?: () => void) {
  const scope = useSettingsScope()
  const client = useQueryClient()
  return useMutation({
    mutationKey: [...scope.key, 'departments'],
    mutationFn: (action: DepartmentAction) => {
      scope.assertAdmin()
      if (action.kind === 'create') return departmentApi.create(action.payload)
      if (action.kind === 'update')
        return departmentApi.update(action.id, action.payload)
      return departmentApi.remove(action.id)
    },
    onSuccess: async (_, action) => {
      if (!scope.isCurrent()) return
      if (action.kind === 'delete') {
        client.removeQueries({
          queryKey: [...scope.key, 'departments', 'detail', action.id],
          exact: true,
        })
      } else if (action.kind === 'update') {
        await client.invalidateQueries({
          queryKey: [...scope.key, 'departments', 'detail', action.id],
          exact: true,
        })
      }
      await client.invalidateQueries({
        queryKey: [...scope.key, 'departments', 'list'],
        exact: true,
      })
      if (!scope.isCurrent()) return
      toast.success(
        action.kind === 'create'
          ? 'Department created'
          : action.kind === 'delete'
            ? 'Department deleted'
            : 'Department updated',
      )
      onSuccess?.()
    },
    onError: (error) => {
      if (scope.isCurrent()) toast.error(settingsError(error))
    },
  })
}
