import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  // Placeholder — real unread count + dropdown will arrive in Phase 8
  const unreadCount = 0

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      aria-label={`Notifications (${unreadCount} unread)`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px]"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
}
