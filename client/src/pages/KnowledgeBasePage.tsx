import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Placeholder — real KB articles in Phase 7
export function KnowledgeBasePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Articles, FAQs, and troubleshooting guides.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>
            Articles and search. API integration in Phase 7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Knowledge base articles and search — Phase 7.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
