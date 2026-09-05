export function HomePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            {import.meta.env.VITE_APP_NAME || 'ITSM Platform'}
          </h1>
          <p className="text-muted-foreground">
            Phase 0 Foundation Complete — React + TypeScript + Vite + Tailwind CSS
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Foundation</h3>
            <p className="text-sm text-muted-foreground">
              React, TypeScript, Vite, Tailwind CSS
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">State Management</h3>
            <p className="text-sm text-muted-foreground">
              Redux Toolkit + React Query
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">UI Components</h3>
            <p className="text-sm text-muted-foreground">shadcn/ui base components</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">API Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Base URL: {import.meta.env.VITE_API_BASE_URL}
          </p>
        </div>
      </div>
    </div>
  )
}
