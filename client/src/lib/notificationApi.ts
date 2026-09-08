import apiClient from '@/lib/apiClient'
import type {
  Notification,
  NotificationApiEnvelope,
  NotificationMarkAllResult,
  NotificationUnreadCount,
} from '@/types/notification'

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as NotificationApiEnvelope<T>
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Request failed')
  }
  return envelope.data
}

export const notificationApi = {
  async list(): Promise<Notification[]> {
    return unwrap(await apiClient.get<NotificationApiEnvelope<Notification[]>>('/notifications'))
  },

  async getUnreadCount(): Promise<NotificationUnreadCount> {
    return unwrap(
      await apiClient.get<NotificationApiEnvelope<NotificationUnreadCount>>(
        '/notifications/unread-count',
      ),
    )
  },

  async get(id: string): Promise<Notification> {
    return unwrap(
      await apiClient.get<NotificationApiEnvelope<Notification>>(`/notifications/${id}`),
    )
  },

  async markRead(id: string): Promise<Notification> {
    return unwrap(
      await apiClient.patch<NotificationApiEnvelope<Notification>>(
        `/notifications/${id}/read`,
      ),
    )
  },

  async markAllRead(): Promise<NotificationMarkAllResult> {
    return unwrap(
      await apiClient.patch<NotificationApiEnvelope<NotificationMarkAllResult>>('/notifications/read-all'),
    )
  },

  async remove(id: string): Promise<Notification> {
    return unwrap(
      await apiClient.delete<NotificationApiEnvelope<Notification>>(`/notifications/${id}`),
    )
  },
}