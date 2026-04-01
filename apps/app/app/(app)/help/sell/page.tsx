import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_SELL_CHECKLIST } from "@/lib/help/support-center";

import { HelpChecklistCard } from "../_components/help-checklist-card";
import { HelpPageShell } from "../_components/help-page-shell";

export default function HelpSellPage() {
  return (
    <HelpPageShell
      title="Run Sale"
      description="Fast checkout guidance with clear fallback actions when checkout is blocked."
      topic="sell"
      badge="Task Guide"
    >
      <HelpChecklistCard
        title="Checkout Flow"
        description="Follow this path for consistent POS execution and cleaner audit trails."
        items={HELP_SELL_CHECKLIST}
      />

      <Card>
        <CardHeader>
          <CardTitle>High-Risk Moments</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Credit tender without valid customer profile will fail.</li>
            <li>Refreshing mid-checkout can hide completion state.</li>
            <li>If an error appears after payment, verify sales history before retrying.</li>
            <li>Use troubleshooting guide before rebuilding complex carts.</li>
          </ul>
        </CardContent>
      </Card>
    </HelpPageShell>
  );
}
