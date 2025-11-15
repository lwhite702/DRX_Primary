import { Card } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Configure your DRX CRM preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        <Card className="p-6">
          <h2 className="text-xl font-bold">Business Profile</h2>
          <p className="text-muted-foreground mt-2">Update your business information</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold">User Management</h2>
          <p className="text-muted-foreground mt-2">Manage team members and permissions</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold">System Preferences</h2>
          <p className="text-muted-foreground mt-2">Configure system settings</p>
        </Card>
      </div>
    </div>
  )
}
