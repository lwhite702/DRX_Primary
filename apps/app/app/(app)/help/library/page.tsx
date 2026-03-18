import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpLibraryEmbed } from "@/components/featurebase/help-library-embed";
import { normalizeHelpTopic } from "@/lib/help/support-center";

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
          Use topic filters to stay in context while browsing detailed guidance.
        </CardContent>
      </Card>

      <HelpLibraryEmbed />
    </HelpPageShell>
  );
}
