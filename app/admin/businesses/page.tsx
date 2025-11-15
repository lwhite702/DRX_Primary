import { Card } from "@/components/ui/card"

export default function AdminBusinessesPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Businesses</h1>
        <p className="text-muted-foreground mt-2">Manage all connected businesses</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Business List</h2>
        <p className="text-muted-foreground mt-4">No businesses yet</p>
      </Card>
    </div>
  )
}
