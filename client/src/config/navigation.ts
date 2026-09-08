import {
  LayoutDashboard,
  Microscope,
  AlertTriangle,
  Package,
  Clock,
  GitBranch,
  BookOpen,
  BarChart3,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { UserRole } from '@/types/auth'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /**
   * When present, the item is only shown to users with one of the
   * listed roles. The backend still enforces the actual authorization.
   */
  visibleTo?: UserRole[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Service Management',
    items: [
      { label: 'Incidents', to: '/incidents', icon: AlertTriangle },
      { label: 'Service Requests', to: '/service-requests', icon: Package },
      { label: 'Root Cause Analysis', to: '/rcas', icon: Microscope },
      { label: 'Changes', to: '/changes', icon: GitBranch },
      { label: 'SLA', to: '/sla', icon: Clock },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Assets', to: '/assets', icon: Package },
      { label: 'Knowledge Base', to: '/knowledge-base', icon: BookOpen },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Analytics', to: '/analytics', icon: BarChart3 }],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'User Management',
        to: '/users',
        icon: Users,
        visibleTo: ['admin'],
      },
      {
        label: 'Support Teams',
        to: '/support-teams',
        icon: Users,
        visibleTo: ['admin'],
      },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

/**
 * Filters the nav groups down to the items the current user is allowed
 * to see. Items with no `visibleTo` constraint are always shown.
 */
export function filterNavForRole(
  groups: NavGroup[],
  role: UserRole | undefined,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.visibleTo || (role && item.visibleTo.includes(role)),
      ),
    }))
    .filter((group) => group.items.length > 0)
}
