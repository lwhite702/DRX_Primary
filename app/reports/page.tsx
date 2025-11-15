import { Card } from "@/components/ui/card"

export default function ReportsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">Generate and view business reports</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Available Reports</h2>
        <p className="text-muted-foreground mt-4">No reports yet</p>
      </Card>
    </div>
  )
}
