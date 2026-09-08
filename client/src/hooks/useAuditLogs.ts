import { useQuery } from '@tanstack/react-query'
import {
  useSettingsScope,
  settingsQueryOptions,
} from '@/hooks/useSettingsScope'
import { auditApi } from '@/lib/auditApi'
import type { AuditLogRecord } from '@/types/audit'

export const auditKeys = {
  list: (scope: readonly unknown[]) =>
    [...scope, 'audit-logs', 'list'] as const,
}

export function useAuditLogs(
  enabled = true,
  select?: (records: AuditLogRecord[]) => AuditLogRecord[],
) {
  const scope = useSettingsScope()
  return useQuery({
    ...settingsQueryOptions,
    queryKey: auditKeys.list(scope.key),
    queryFn: ({ signal }) => auditApi.list(signal),
    enabled: scope.isAdmin && enabled,
    select,
  })
}
