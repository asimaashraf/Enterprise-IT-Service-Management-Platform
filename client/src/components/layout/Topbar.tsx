import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { MobileSidebar } from './MobileSidebar'
import { Separator } from '@/components/ui/separator'

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:px-6">
      {/* Mobile menu trigger */}
      <MobileSidebar triggerClassName="lg:hidden" />

      {/* Mobile brand */}
      <div className="flex min-w-0 items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="text-sm font-bold">IT</span>
        </div>
        <span className="truncate text-sm font-semibold">ITSM Platform</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationBell />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <UserMenu />
      </div>
    </header>
  )
}
