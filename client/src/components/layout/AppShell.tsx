import { Outlet } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { NotificationSocketBridge } from '@/components/notifications/NotificationSocketBridge'

/**
 * Authenticated application shell.
 *
 * Layout:
 * - Desktop (md+): persistent sidebar on the left, content on the right.
 * - Mobile (<md): hidden sidebar revealed via the Topbar's sheet trigger.
 */
export function AppShell() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <NotificationSocketBridge />
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
