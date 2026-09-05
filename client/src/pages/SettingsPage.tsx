import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Placeholder — real settings pages in Phase 1
export function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Application configuration and preferences.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Account, appearance, and notification settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Settings UI — Phase 1.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
