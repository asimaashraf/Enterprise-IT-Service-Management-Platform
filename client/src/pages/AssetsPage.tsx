import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Placeholder — real CRUD and API integration in Phase 4
export function AssetsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
        <p className="text-muted-foreground">
          Manage IT infrastructure and configuration items.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Asset Management</CardTitle>
          <CardDescription>
            Asset inventory, lifecycle, and maintenance. API integration in Phase 4.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Asset management and lifecycle tracking — Phase 4.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
