import { Card } from "@/components/ui/card"

export default function SalesPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales</h1>
        <p className="text-muted-foreground mt-2">Manage and track sales transactions</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Sales Transactions</h2>
        <p className="text-muted-foreground mt-4">No sales yet</p>
      </Card>
    </div>
  )
}
