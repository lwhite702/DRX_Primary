import { Card } from "@/components/ui/card"

export default function InventoryPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground mt-2">Manage inventory and stock levels</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Inventory Items</h2>
        <p className="text-muted-foreground mt-4">No items yet</p>
      </Card>
    </div>
  )
}
