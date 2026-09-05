import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Placeholder — real CRUD and API integration in Phase 6
export function ChangesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Changes</h1>
        <p className="text-muted-foreground">
          Plan, approve, and track change requests.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Change Management</CardTitle>
          <CardDescription>
            Change requests, risk, and approval workflow. API integration in Phase 6.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Change request workflow — Phase 6.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
