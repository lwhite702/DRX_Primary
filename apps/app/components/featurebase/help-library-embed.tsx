"use client";

import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { useFeaturebaseHelpEmbed } from "@/lib/hooks/use-featurebase-help-embed";
import {
  HELP_SECTION_ROUTES,
  buildHelpLibraryHref,
  getHelpLibraryContext,
  normalizeHelpTopic,
} from "@/lib/help/support-center";

function getQueryParam(
  value: string | string[] | null | undefined,
): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function HelpLibraryEmbed() {
  const searchParams = useSearchParams();

  const topicParam = getQueryParam(searchParams.get("topic"));
  const pathParam = getQueryParam(searchParams.get("path"));

  const topic = normalizeHelpTopic(topicParam);
  const context = getHelpLibraryContext(topic);

  const { initEmbed, isInitialized } = useFeaturebaseHelpEmbed({
    organization: process.env.NEXT_PUBLIC_FEATUREBASE_ORG || "deelrxcrm",
    routeSyncingBasePath: "/help/library",
    path: pathParam || context.path,
    filters: context.filters,
  });

  const featurebaseScriptProps = {
    id: "featurebase-sdk-help-library",
    src: "https://do.featurebase.app/js/sdk.js",
    onLoad: () => initEmbed(true),
  } as ComponentProps<typeof Script>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-muted/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-accent/40 text-accent">
            Topic
          </Badge>
          <span className="text-sm font-medium">{context.label}</span>
        </div>
        <p className="text-sm text-muted-foreground">{context.subtitle}</p>
        <div className="flex flex-wrap gap-2">
          {HELP_SECTION_ROUTES.map((section) => {
            const isActive = section.id === topic;
            return (
              <Link
                key={section.id}
                href={buildHelpLibraryHref(section.id)}
                className={
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (isActive
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-white/10 text-muted-foreground hover:border-accent/40 hover:text-foreground")
                }
              >
                {section.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-background/70 p-3">
        <div
          data-featurebase-embed
          data-testid="featurebase-help-embed"
          className="w-full min-h-[780px]"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {isInitialized
            ? "Knowledge base is connected."
            : "Connecting knowledge base..."}
        </span>
        <button
          type="button"
          className="underline underline-offset-4 hover:text-foreground"
          onClick={() => initEmbed(true)}
        >
          Reload Embed
        </button>
      </div>

      <Script {...featurebaseScriptProps} />
    </div>
  );
}
