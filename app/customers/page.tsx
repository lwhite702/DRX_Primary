import { Card } from "@/components/ui/card"

export default function CustomersPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground mt-2">Manage customer profiles and data</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Customer List</h2>
        <p className="text-muted-foreground mt-4">No customers yet</p>
      </Card>
    </div>
  )
}
