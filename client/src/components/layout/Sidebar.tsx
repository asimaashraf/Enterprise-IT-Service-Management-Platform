import { NavLink } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { navGroups } from '@/config/navigation'
import { SidebarNavItem } from './SidebarContent'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="text-sm font-bold">IT</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">ITSM Platform</span>
          <span className="text-xs text-sidebar-muted">MERN-014</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                {group.label}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarNavItem
                    key={item.to}
                    item={item}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
              {group !== navGroups[navGroups.length - 1] && (
                <Separator className="mt-4 bg-sidebar-border" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-muted">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="block truncate hover:text-sidebar-foreground"
        >
          v{import.meta.env.VITE_APP_VERSION || '0.1.0'}
        </NavLink>
      </div>
    </aside>
  )
}
