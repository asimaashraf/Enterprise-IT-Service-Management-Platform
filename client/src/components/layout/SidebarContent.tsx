import { Link, useLocation } from 'react-router-dom'
import { type NavItem } from '@/config/navigation'

import { cn } from '@/lib/utils'

interface SidebarNavItemProps {
  item: NavItem
  onNavigate?: () => void
}

export function SidebarNavItem({ item, onNavigate }: SidebarNavItemProps) {
  const location = useLocation()
  const isActive =
    item.to === '/'
      ? location.pathname === '/'
      : location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`)

  const Icon = item.icon

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-foreground'
          : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground',
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
