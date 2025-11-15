import { Card } from "@/components/ui/card"

export default function AdminAIPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Management</h1>
        <p className="text-muted-foreground mt-2">Configure and manage AI systems</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">AI Models</h2>
        <p className="text-muted-foreground mt-4">No models configured yet</p>
      </Card>
    </div>
  )
}
