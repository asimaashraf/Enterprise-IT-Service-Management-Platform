import { Outlet } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { NotificationSocketBridge } from '@/components/notifications/NotificationSocketBridge'

/**
 * Authenticated application shell.
 *
 * Layout:
 * - Desktop (lg+): persistent sidebar on the left, content on the right.
 * - Mobile/tablet (<lg): hidden sidebar revealed via the Topbar's sheet trigger.
 */
export function AppShell() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <NotificationSocketBridge />
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
