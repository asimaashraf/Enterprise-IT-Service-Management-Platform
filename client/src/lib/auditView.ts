import type { AuditFilters, AuditLogRecord } from '@/types/audit'

export function filterAuditRecords(
  records: AuditLogRecord[],
  filters: AuditFilters,
): AuditLogRecord[] {
  const search = filters.search.trim().toLocaleLowerCase()
  return records
    .filter(
      (record) =>
        (!filters.outcome || record.outcome === filters.outcome) &&
        (!filters.resourceType ||
          record.resourceType === filters.resourceType) &&
        (!filters.actorRole || record.actorRole === filters.actorRole) &&
        (!search ||
          [
            record.actorEmail,
            record.action,
            record.eventType,
            record.resourceType,
            record.resourceId,
          ].some((value) => value?.toLocaleLowerCase().includes(search))),
    )
    .sort((a, b) => {
      const time = (value: string) => {
        const timestamp = Date.parse(value)
        return Number.isNaN(timestamp) ? 0 : timestamp
      }
      return time(b.createdAt) - time(a.createdAt)
    })
}

export function formatAuditTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Timestamp unavailable'
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
}
