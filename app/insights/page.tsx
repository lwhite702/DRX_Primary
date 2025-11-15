import { Card } from "@/components/ui/card"

export default function InsightsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Insights</h1>
        <p className="text-muted-foreground mt-2">AI-powered business intelligence and recommendations</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Insights</h2>
        <p className="text-muted-foreground mt-4">No insights generated yet</p>
      </Card>
    </div>
  )
}
