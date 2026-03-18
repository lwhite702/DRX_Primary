import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_START_CHECKLIST } from "@/lib/help/support-center";

import { HelpChecklistCard } from "../_components/help-checklist-card";
import { HelpPageShell } from "../_components/help-page-shell";

export default function HelpStartPage() {
  return (
    <HelpPageShell
      title="Start Shift"
      description="Use this sequence before opening to avoid setup loops and bad baseline data."
      topic="start"
      badge="Task Guide"
    >
      <HelpChecklistCard
        title="Startup Checklist"
        description="Concise first: complete these in order, then expand details only if needed."
        items={HELP_START_CHECKLIST}
      />

      <Card>
        <CardHeader>
          <CardTitle>Before First Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Confirm active business/workspace in top navigation.</li>
            <li>Use non-owner operator account for live checkout workflows.</li>
            <li>Verify at least one inventory intake exists for test SKU.</li>
            <li>Confirm role-based access works before shift handoff.</li>
          </ul>
        </CardContent>
      </Card>
    </HelpPageShell>
  );
}
