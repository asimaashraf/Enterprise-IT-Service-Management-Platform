import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Placeholder — real CRUD and API integration in Phase 3
export function IncidentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
        <p className="text-muted-foreground">
          Manage service disruptions and outages.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Incident Management</CardTitle>
          <CardDescription>
            List, create, and track incidents. API integration in Phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Incident CRUD, assignment, and workflow — Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
