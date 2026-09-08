import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { Badge } from '@/components/ui/badge'
import { NotificationList } from '@/components/notifications/NotificationList'
import { NotificationPreviewDialog } from '@/components/notifications/NotificationPreviewDialog'
import { supportsNotificationPreview } from '@/lib/notificationPreview'
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications'
import type { Notification } from '@/types/notification'
import type { RootState } from '@/store'

function readableDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : formatDistanceToNow(date, { addSuffix: true })
}

export function NotificationsPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const query = useNotifications(user)
  const markRead = useMarkNotificationRead(user)
  const markAllRead = useMarkAllNotificationsRead(user)
  const remove = useDeleteNotification(user)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null)
  const [previewTarget, setPreviewTarget] = useState<Notification | null>(null)

  const notifications = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return query.data ?? []
    return (query.data ?? []).filter((notification) =>
      [notification.title, notification.message, notification.type, notification.priority]
        .some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [query.data, search])

  const columns: ColumnDef<Notification>[] = [
    {
      id: 'notification',
      header: 'Notification',
      accessorFn: (row) => row.title,
      cell: ({ row }) => {
        const notification = row.original
        const body = (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={notification.status === 'Unread' ? 'font-semibold' : undefined}>{notification.title}</span>
              {notification.status === 'Unread' && <Badge variant="secondary">Unread</Badge>}
            </div>
            <p className="mt-1 max-w-xl truncate text-sm text-muted-foreground">{notification.message}</p>
          </div>
        )
        return <button type="button" onClick={() => { if (notification._id) markRead.mutate(notification._id); if (supportsNotificationPreview(notification)) setPreviewTarget(notification) }} className="max-w-[34rem] text-left">{body}</button>
      },
    },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{row.original.type}</span> },
    { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <Badge variant="outline" className="whitespace-nowrap text-xs">{row.original.priority}</Badge> },
    { accessorKey: 'createdAt', header: 'Received', cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{readableDate(row.original.createdAt)}</span> },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === 'Unread' && <Button variant="ghost" size="icon" aria-label={`Mark ${row.original.title} as read`} onClick={() => markRead.mutate(row.original._id ?? row.original.notificationId)}><CheckCheck className="h-4 w-4" /></Button>}
          <Button variant="ghost" size="icon" aria-label={`Delete ${row.original.title}`} onClick={() => setDeleteTarget(row.original)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  if (query.isError) return <ErrorState title="Notifications could not be loaded" description="Try again to reload your notification history." onRetry={() => query.refetch()} />

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader title="Notification History" description="The current notification feed for your account." icon={Bell} actions={<Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}><CheckCheck className="mr-2 h-4 w-4" />Mark all as read</Button>} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search current notifications" aria-label="Search current notifications" className="max-w-sm" />
        <p className="text-sm text-muted-foreground">{query.data?.length ?? 0} notification{query.data?.length === 1 ? '' : 's'} in the current feed</p>
      </div>
      <div className="hidden md:block">
        <DataTable columns={columns} data={notifications} loading={query.isLoading} emptyTitle="No notifications" emptyDescription="New activity for your account will appear here." />
      </div>
      <div className="md:hidden rounded-lg border bg-card">
        {query.isLoading ? <p className="p-6 text-center text-sm text-muted-foreground">Loading notifications…</p> : <NotificationList notifications={notifications} onRead={(notification) => notification._id && markRead.mutate(notification._id)} onPreview={setPreviewTarget} />}
      </div>
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Delete notification?" description="This removes the notification from your owned feed." confirmLabel="Delete" confirmVariant="destructive" loading={remove.isPending} onConfirm={() => { if (!deleteTarget) return; remove.mutate(deleteTarget._id ?? deleteTarget.notificationId, { onSuccess: () => { toast.success('Notification deleted'); setDeleteTarget(null) } }) }} />
      <NotificationPreviewDialog notification={previewTarget} onClose={() => setPreviewTarget(null)} />
    </div>
  )
}