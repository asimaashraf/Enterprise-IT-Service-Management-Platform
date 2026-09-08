import type { Notification } from '@/types/notification'

export function supportsNotificationPreview(notification: Notification): boolean {
  return notification.relatedEntity?.entityType === 'Incident' || notification.relatedEntity?.entityType === 'RCA'
}