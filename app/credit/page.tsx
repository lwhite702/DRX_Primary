import { Card } from "@/components/ui/card"

export default function CreditPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Credit Management</h1>
        <p className="text-muted-foreground mt-2">Track credit transactions and fronts</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Credit Transactions</h2>
        <p className="text-muted-foreground mt-4">No transactions yet</p>
      </Card>
    </div>
  )
}
