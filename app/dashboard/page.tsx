import { Card } from "@/components/ui/card"

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome to your DRX CRM dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Sales</h3>
          <p className="text-3xl font-bold mt-2">$0.00</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Active Customers</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Inventory Items</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Credit Outstanding</h3>
          <p className="text-3xl font-bold mt-2">$0.00</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Recent Activity</h2>
        <p className="text-muted-foreground mt-4">No recent activity yet</p>
      </Card>
    </div>
  )
}
