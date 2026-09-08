import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Settings,
  Users,
  UsersRound,
  ScrollText,
} from 'lucide-react'
import { OrganizationProfile } from '@/components/settings/organization-profile'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { useSettingsScope } from '@/hooks/useSettingsScope'

const resources = [
  {
    title: 'Departments',
    description: 'Create and manage organization departments.',
    to: '/settings/departments',
    icon: Building2,
  },
  {
    title: 'User Management',
    description: 'Manage invitations, access, and ADMIN / EMPLOYEE roles.',
    to: '/users',
    icon: Users,
  },
  {
    title: 'Support Teams',
    description:
      'Manage operational teams and eligible administrator membership.',
    to: '/support-teams',
    icon: UsersRound,
  },
  {
    title: 'Audit Logs',
    description: 'Review organization activity, actors, and recorded outcomes.',
    to: '/settings/audit-logs',
    icon: ScrollText,
  },
]

export function SettingsPage() {
  const { isAdmin } = useSettingsScope()
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Settings"
        description={
          isAdmin
            ? 'Organization profile and administration.'
            : 'View your organization profile.'
        }
        icon={Settings}
      />
      <OrganizationProfile />
      {isAdmin && (
        <section aria-labelledby="administration-title" className="space-y-3">
          <h2 id="administration-title" className="text-lg font-semibold">
            Administration
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {resources.map(({ title, description, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader className="space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-primary" />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
