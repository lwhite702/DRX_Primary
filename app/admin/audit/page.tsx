import { Card } from "@/components/ui/card"

export default function AdminAuditPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">System activity and security logs</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Recent Activity</h2>
        <p className="text-muted-foreground mt-4">No audit logs yet</p>
      </Card>
    </div>
  )
}
