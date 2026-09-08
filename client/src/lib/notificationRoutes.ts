import type { NotificationRelatedEntity } from '@/types/notification'

/** Only routes that are present in the authenticated frontend are returned. */
export function getNotificationRoute(relatedEntity?: NotificationRelatedEntity): string | null {
  if (!relatedEntity) return null
  switch (relatedEntity.entityType) {
    case 'Incident':
      return `/incidents/${relatedEntity.entityId}`
    case 'RCA':
      return `/rcas/${relatedEntity.entityId}`
    default:
      return null
  }
}