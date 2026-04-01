import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_TROUBLESHOOT_ISSUES } from "@/lib/help/support-center";

import { HelpPageShell } from "../_components/help-page-shell";
import { HelpTroubleshootCard } from "../_components/help-troubleshoot-card";

export default function HelpTroubleshootPage() {
  return (
    <HelpPageShell
      title="Fix Problems"
      description="Run targeted checks before escalation to reduce downtime and duplicate incidents."
      topic="troubleshoot"
      badge="Troubleshooting"
    >
      <HelpTroubleshootCard
        title="Common Incidents"
        description="Start with concise checks, then expand recovery notes if needed."
        issues={HELP_TROUBLESHOOT_ISSUES}
      />

      <Card>
        <CardHeader>
          <CardTitle>Escalate When</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Error reproduces after one safe retry.</li>
            <li>Sales completion state is unclear after payment attempt.</li>
            <li>Data mismatch persists after scope/date verification.</li>
            <li>Issue blocks frontline checkout or inventory controls.</li>
          </ul>
        </CardContent>
      </Card>
    </HelpPageShell>
  );
}
