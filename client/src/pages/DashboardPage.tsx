import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Placeholder dashboard — business logic and real data arrive in Phase 2+
export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the ITSM Platform. Select a module from the sidebar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Open Incidents', value: '—', color: 'text-destructive' },
          { label: 'Active Changes', value: '—', color: 'text-orange-500' },
          { label: 'SLA Compliance', value: '—', color: 'text-green-600' },
          { label: 'Pending Approvals', value: '—', color: 'text-primary' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>Latest incident activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['No recent incidents', 'Placeholder data — Phase 2'].map((msg, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="text-muted-foreground">{msg}</span>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common ITSM operations</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {['Report Incident', 'Request Service', 'View Assets', 'Knowledge Base'].map(
              (action) => (
                <button
                  key={action}
                  className="rounded-md border bg-secondary p-3 text-center text-sm font-medium transition-colors hover:bg-accent"
                >
                  {action}
                </button>
              ),
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
