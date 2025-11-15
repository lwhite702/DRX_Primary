import { Card } from "@/components/ui/card"

export default function AdminUsersPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-2">Manage system users and permissions</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">User List</h2>
        <p className="text-muted-foreground mt-4">No users yet</p>
      </Card>
    </div>
  )
}
