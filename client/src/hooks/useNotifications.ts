import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { notificationApi } from '@/lib/notificationApi'
import type { AuthUser } from '@/types/auth'
import type { Notification } from '@/types/notification'

export const notificationKeys = {
  all: ['notifications'] as const,
  feed: (userId: string, organizationId: string) =>
    [...notificationKeys.all, 'feed', userId, organizationId] as const,
  unreadCount: (userId: string, organizationId: string) =>
    [...notificationKeys.all, 'unread-count', userId, organizationId] as const,
  detail: (userId: string, organizationId: string, id: string) =>
    [...notificationKeys.all, 'detail', userId, organizationId, id] as const,
}

function sessionScope(user: AuthUser | null | undefined) {
  return user ? { userId: user.id, organizationId: user.organizationId } : null
}

export function useNotifications(user: AuthUser | null | undefined) {
  const scope = sessionScope(user)
  return useQuery({
    queryKey: scope ? notificationKeys.feed(scope.userId, scope.organizationId) : [...notificationKeys.all, 'feed', 'anonymous'],
    queryFn: () => notificationApi.list(),
    enabled: Boolean(scope),
  })
}

export function useUnreadNotificationCount(user: AuthUser | null | undefined) {
  const scope = sessionScope(user)
  return useQuery({
    queryKey: scope
      ? notificationKeys.unreadCount(scope.userId, scope.organizationId)
      : [...notificationKeys.all, 'unread-count', 'anonymous'],
    queryFn: () => notificationApi.getUnreadCount(),
    enabled: Boolean(scope),
  })
}

export function useMarkNotificationRead(user: AuthUser | null | undefined) {
  const queryClient = useQueryClient()
  const scope = sessionScope(user)
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: (notification) => {
      if (!scope) return
      queryClient.setQueryData<Notification[]>(
        notificationKeys.feed(scope.userId, scope.organizationId),
        (current = []) => current.map((item) =>
          item.notificationId === notification.notificationId || item._id === notification._id
            ? { ...item, ...notification }
            : item,
        ),
      )
      queryClient.setQueryData(notificationKeys.unreadCount(scope.userId, scope.organizationId), (current: { unreadCount: number } | undefined) => ({
        unreadCount: Math.max(0, (current?.unreadCount ?? 0) - 1),
      }))
    },
    onError: (error: Error) => toast.error('Could not mark notification as read', { description: error.message }),
  })
}

export function useMarkAllNotificationsRead(user: AuthUser | null | undefined) {
  const queryClient = useQueryClient()
  const scope = sessionScope(user)
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      if (!scope) return
      queryClient.setQueryData(notificationKeys.unreadCount(scope.userId, scope.organizationId), { unreadCount: 0 })
      queryClient.invalidateQueries({ queryKey: notificationKeys.feed(scope.userId, scope.organizationId) })
    },
    onError: (error: Error) => toast.error('Could not mark notifications as read', { description: error.message }),
  })
}

export function useDeleteNotification(user: AuthUser | null | undefined) {
  const queryClient = useQueryClient()
  const scope = sessionScope(user)
  return useMutation({
    mutationFn: (id: string) => notificationApi.remove(id),
    onSuccess: (notification) => {
      if (!scope) return
      queryClient.setQueryData<Notification[]>(
        notificationKeys.feed(scope.userId, scope.organizationId),
        (current = []) => current.filter((item) => item.notificationId !== notification.notificationId && item._id !== notification._id),
      )
      if (notification.status === 'Unread') {
        queryClient.setQueryData(notificationKeys.unreadCount(scope.userId, scope.organizationId), (current: { unreadCount: number } | undefined) => ({
          unreadCount: Math.max(0, (current?.unreadCount ?? 0) - 1),
        }))
      }
    },
    onError: (error: Error) => toast.error('Could not delete notification', { description: error.message }),
  })
}