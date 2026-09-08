import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

import { createNotificationSocket } from '@/services/notificationSocketService'
import { notificationKeys } from '@/hooks/useNotifications'
import type {
  Notification,
  NotificationRealtimePayload,
  NotificationRelatedEntity,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '@/types/notification'
import type { RootState } from '@/store'

const notificationTypeSet = new Set<string>([
  'Incident Created', 'Incident Assigned', 'Incident Updated', 'Problem Assigned',
  'Problem Updated', 'Service Request Updated', 'Service Request Approval',
  'Change Request Updated', 'Change Request Approval', 'SLA Breached', 'RCA Updated', 'System',
])
const entityTypeSet = new Set<string>(['Incident', 'Problem', 'ServiceRequest', 'Change', 'RCA', 'SLA'])
const prioritySet = new Set<string>(['Low', 'Medium', 'High', 'Critical'])
const statusSet = new Set<string>(['Unread', 'Read'])

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function normalizeNotification(payload: NotificationRealtimePayload): Notification | null {
  const notificationId = asString(payload.notificationId)
  const recipient = asString(payload.recipient)
  const organizationId = asString(payload.organizationId)
  const type = asString(payload.type)
  const title = asString(payload.title)
  const message = asString(payload.message)
  const createdAt = asString(payload.createdAt)
  const updatedAt = asString(payload.updatedAt) ?? createdAt
  if (!notificationId || !recipient || !organizationId || !type || !title || !message || !createdAt || !updatedAt) return null
  if (!notificationTypeSet.has(type)) return null

  const related = payload.relatedEntity
  let relatedEntity: NotificationRelatedEntity | undefined
  if (related && typeof related === 'object') {
    const candidate = related as Record<string, unknown>
    const entityType = asString(candidate.entityType)
    const entityId = asString(candidate.entityId)
    if (!entityType || !entityId || !entityTypeSet.has(entityType)) return null
    relatedEntity = { entityType: entityType as NotificationRelatedEntity['entityType'], entityId }
  }

  return {
    _id: asString(payload._id),
    notificationId,
    recipient,
    organizationId,
    type: type as NotificationType,
    title,
    message,
    priority: (prioritySet.has(asString(payload.priority) ?? '') ? payload.priority : 'Medium') as NotificationPriority,
    status: (statusSet.has(asString(payload.status) ?? '') ? payload.status : 'Unread') as NotificationStatus,
    relatedEntity,
    readAt: asString(payload.readAt),
    createdAt,
    updatedAt,
  }
}

export function NotificationSocketBridge() {
  const queryClient = useQueryClient()
  const { user, token, status } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (status !== 'authenticated' || !user || !token) return

    const feedKey = notificationKeys.feed(user.id, user.organizationId)
    const unreadKey = notificationKeys.unreadCount(user.id, user.organizationId)
    const socket = createNotificationSocket(token, { onNotification: (payload) => {
      const notification = normalizeNotification(payload)
      if (!notification || notification.recipient !== user.id || notification.organizationId !== user.organizationId) return

      let wasAlreadyPresent = false
      queryClient.setQueryData<Notification[]>(feedKey, (current) => {
        if (!current) return [notification]
        wasAlreadyPresent = current.some((item) =>
          item.notificationId === notification.notificationId || (item._id && item._id === notification._id),
        )
        if (wasAlreadyPresent) {
          return current.map((item) => item.notificationId === notification.notificationId ? { ...item, ...notification } : item)
        }
        return [notification, ...current]
      })
      queryClient.invalidateQueries({ queryKey: unreadKey })
      if (!wasAlreadyPresent) {
        toast(notification.title, { description: notification.message })
      }
    }})

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [queryClient, status, token, user])

  return null
}