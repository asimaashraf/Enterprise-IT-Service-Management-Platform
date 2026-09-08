import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useSelector } from 'react-redux'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationList } from '@/components/notifications/NotificationList'
import { NotificationPreviewDialog } from '@/components/notifications/NotificationPreviewDialog'
import { useMarkNotificationRead, useNotifications, useUnreadNotificationCount } from '@/hooks/useNotifications'
import type { RootState } from '@/store'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const user = useSelector((state: RootState) => state.auth.user)
  const feedQuery = useNotifications(user)
  const unreadQuery = useUnreadNotificationCount(user)
  const markRead = useMarkNotificationRead(user)
  const unreadCount = unreadQuery.data?.unreadCount ?? 0
  const recent = (feedQuery.data ?? []).slice(0, 5)
  const [previewTarget, setPreviewTarget] = useState<import('@/types/notification').Notification | null>(null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative', className)} aria-label={`Notifications (${unreadCount} unread)`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <Badge variant="destructive" className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px]">{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span>Notifications</span>
          <span className="font-normal text-muted-foreground">{unreadCount} unread</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {feedQuery.isLoading ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading notifications…</p> : feedQuery.isError ? <p className="px-4 py-8 text-center text-sm text-destructive">Notifications could not be loaded.</p> : <NotificationList notifications={recent} onRead={(notification) => notification._id && markRead.mutate(notification._id)} onPreview={setPreviewTarget} compact />}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Button variant="outline" size="sm" className="w-full" asChild><Link to="/notifications">View notification history</Link></Button>
        </div>
      </DropdownMenuContent>
      <NotificationPreviewDialog notification={previewTarget} onClose={() => setPreviewTarget(null)} />
    </DropdownMenu>
  )
}
