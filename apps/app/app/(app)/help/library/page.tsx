import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpLibraryEmbed } from "@/components/featurebase/help-library-embed";
import { normalizeHelpTopic } from "@/lib/help/support-center";
import Link from "next/link";

import { HelpPageShell } from "../_components/help-page-shell";

type HelpLibraryPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function readParam(
  value: string | string[] | undefined,
): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function HelpLibraryPage({ searchParams }: HelpLibraryPageProps) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const topic = normalizeHelpTopic(readParam(params.topic));

  return (
    <HelpPageShell
      title="Knowledge Library"
      description="Featurebase-powered long-form docs connected to your task context."
      topic={topic}
      badge="Featurebase"
    >
      <Card>
        <CardHeader>
          <CardTitle>Full Documentation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use topic filters to stay in context while browsing detailed guidance. If
          docs do not load in your environment, use the task-first guides from
          Support Center and escalate through Troubleshoot.
        </CardContent>
      </Card>

      <HelpLibraryEmbed />

      <Card>
        <CardHeader>
          <CardTitle>Need a fallback path?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          For urgent issues, open{" "}
          <Link
            href="/help/troubleshoot"
            className="text-accent underline underline-offset-2"
          >
            Troubleshoot
          </Link>{" "}
          and include route, action sequence, and expected vs actual outcome.
        </CardContent>
      </Card>
    </HelpPageShell>
  );
}
