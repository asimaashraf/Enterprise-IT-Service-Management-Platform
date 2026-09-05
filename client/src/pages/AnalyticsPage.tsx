import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Placeholder — real analytics in Phase 9
export function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Reports and performance metrics.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Analytics & Reports</CardTitle>
          <CardDescription>
            Incident trends, SLA compliance, and resolution metrics. API integration in Phase 9.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Analytics charts and reports — Phase 9.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
