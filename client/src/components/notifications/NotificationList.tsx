import { BellRing, Check, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supportsNotificationPreview } from '@/lib/notificationPreview'
import type { Notification } from '@/types/notification'

function readableDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Recently' : formatDistanceToNow(date, { addSuffix: true })
}

export function NotificationList({
  notifications,
  onRead,
  onPreview,
  onNavigate,
  compact = false,
}: {
  notifications: Notification[]
  onRead: (notification: Notification) => void
  onPreview?: (notification: Notification) => void
  onNavigate?: () => void
  compact?: boolean
}) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
        <BellRing className="h-7 w-7" />
        <p>No notifications yet.</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {notifications.map((notification) => {
        const content = (
          <div className="flex gap-3 px-3 py-3">
            <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', notification.status === 'Unread' ? 'bg-primary' : 'bg-muted')} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={cn('truncate text-sm', notification.status === 'Unread' && 'font-semibold')}>
                  {notification.title}
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{readableDate(notification.createdAt)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {notification.priority} priority · {notification.type}
              </p>
            </div>
            {notification.status === 'Unread' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label={`Mark ${notification.title} as read`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onRead(notification)
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        )

        return (
          <div
            key={notification.notificationId}
            role="button"
            tabIndex={0}
            onClick={() => {
              onRead(notification)
              if (supportsNotificationPreview(notification)) onPreview?.(notification)
              onNavigate?.()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onRead(notification)
                if (supportsNotificationPreview(notification)) onPreview?.(notification)
                onNavigate?.()
              }
            }}
            className="block cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
          >
            {content}
          </div>
        )
      })}
      {compact && (
        <div className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" /> Related links open only for supported record types.
        </div>
      )}
    </div>
  )
}