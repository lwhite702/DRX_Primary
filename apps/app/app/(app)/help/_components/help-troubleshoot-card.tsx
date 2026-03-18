import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HelpIssue } from "@/lib/help/support-center";

type HelpTroubleshootCardProps = {
  title: string;
  description: string;
  issues: HelpIssue[];
};

export function HelpTroubleshootCard({
  title,
  description,
  issues,
}: HelpTroubleshootCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-accent" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {issues.map((issue) => (
          <div
            key={issue.title}
            className="rounded-xl border border-white/10 bg-muted/20 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{issue.title}</h3>
              <Badge variant="outline" className="text-xs">
                {issue.severity}
              </Badge>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {issue.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            <details className="rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-muted-foreground">
              <summary className="cursor-pointer select-none font-semibold text-foreground">
                Recovery
              </summary>
              <p className="mt-2">{issue.recovery}</p>
            </details>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
