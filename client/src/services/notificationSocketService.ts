import { io, type Socket } from 'socket.io-client'

import type { NotificationRealtimePayload } from '@/types/notification'

export interface NotificationSocketHandlers {
  onNotification: (payload: NotificationRealtimePayload) => void
}

function socketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (apiUrl) return apiUrl.replace(/\/api\/v1\/?$/, '')
  return window.location.origin
}

export function createNotificationSocket(
  token: string,
  handlers: NotificationSocketHandlers,
): Socket {
  const socket = io(socketUrl(), {
    auth: { token },
    autoConnect: true,
    reconnection: true,
  })

  socket.on('notification:new', handlers.onNotification)
  return socket
}