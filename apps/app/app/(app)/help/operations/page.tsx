import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_OPERATIONS_CHECKLIST } from "@/lib/help/support-center";

import { HelpChecklistCard } from "../_components/help-checklist-card";
import { HelpPageShell } from "../_components/help-page-shell";

export default function HelpOperationsPage() {
  return (
    <HelpPageShell
      title="Run Operations"
      description="Daily operations checks across inventory, product hygiene, customers, credit, and reports."
      topic="operations"
      badge="Task Guide"
    >
      <HelpChecklistCard
        title="Operations Checklist"
        description="Use this loop each shift to keep data and decision-making stable."
        items={HELP_OPERATIONS_CHECKLIST}
      />

      <Card>
        <CardHeader>
          <CardTitle>Closeout Review</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Validate low-stock list before creating next intake order.</li>
            <li>Review partial credit payments and follow-up queue.</li>
            <li>Spot-check top products for pricing or SKU anomalies.</li>
            <li>Confirm day/week totals in the correct business scope.</li>
          </ul>
        </CardContent>
      </Card>
    </HelpPageShell>
  );
}
