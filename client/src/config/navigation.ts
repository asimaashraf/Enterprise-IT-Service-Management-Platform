import {
  LayoutDashboard,
  AlertTriangle,
  Package,
  Clock,
  GitBranch,
  BookOpen,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
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
    items: [{ label: 'Settings', to: '/settings', icon: Settings }],
  },
]
