import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HELP_SECTION_ROUTES,
  buildHelpLibraryHref,
} from "@/lib/help/support-center";

import { HelpPageShell } from "./_components/help-page-shell";

export default function HelpPage() {
  return (
    <HelpPageShell
      title="Support Center"
      description="Choose the task you are trying to complete. Each guide is concise-first, with deeper details and escalation tools close by."
      badge="Task-First Help"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            Choose Your Task
          </CardTitle>
          <CardDescription>
            Start with the workflow you need right now.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {HELP_SECTION_ROUTES.map((section) => (
            <div
              key={section.id}
              className="rounded-xl border border-white/10 bg-muted/20 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs border-accent/40 text-accent">
                  {section.label}
                </Badge>
                <Link
                  href={section.href}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Open Guide
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">{section.description}</p>
              <Link href={buildHelpLibraryHref(section.id)}>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  Read Full Docs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Escalation Flow</CardTitle>
          <CardDescription>
            Keep support requests actionable and avoid duplicate transaction risk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
            <li>Run the relevant task guide checks first.</li>
            <li>Confirm whether a sale/receipt already exists before retrying.</li>
            <li>Escalate with route, action sequence, and expected vs actual outcome.</li>
            <li>Attach screenshot or sales evidence for faster support triage.</li>
          </ol>
        </CardContent>
      </Card>
    </HelpPageShell>
  );
}
