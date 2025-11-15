import { Card } from "@/components/ui/card"

export default function AdminPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Susana's Admin Console</h1>
        <p className="text-muted-foreground mt-2">Enterprise administration and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold">Businesses</h3>
          <p className="text-muted-foreground mt-2">Manage connected businesses</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold">Users</h3>
          <p className="text-muted-foreground mt-2">Manage system users and roles</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold">Audit Logs</h3>
          <p className="text-muted-foreground mt-2">View system audit trails</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold">AI Management</h3>
          <p className="text-muted-foreground mt-2">Configure AI systems</p>
        </Card>
      </div>
    </div>
  )
}
