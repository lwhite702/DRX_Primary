"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, BookOpen, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HELP_SECTION_ROUTES,
  buildHelpLibraryHref,
  getHelpLibraryContext,
  normalizeHelpTopic,
  type HelpTopicId,
} from "@/lib/help/support-center";
import { docsHubUrl } from "@/lib/docs-links";

interface DocLink {
  title: string;
  description: string;
  url: string;
  badge?: string;
}

const TOPIC_DOCS: Record<HelpTopicId, DocLink[]> = {
  start: [
    {
      title: "Get started with DRX",
      description: "Create an owner account, set up your business, and record your first verified sale.",
      url: `${docsHubUrl}/start/get-started-with-drx`,
      badge: "Essential",
    },
    {
      title: "Workspaces and team access",
      description: "Switch between businesses, assign employee roles, and enforce security boundaries.",
      url: `${docsHubUrl}/access/switch-workspaces-and-check-access`,
      badge: "Security",
    },
    {
      title: "Privacy and minimal data",
      description: "Configure privacy presets and understand automated customer record retention cleanup.",
      url: `${docsHubUrl}/privacy/privacy-and-minimal-data`,
      badge: "Privacy",
    },
  ],
  sell: [
    {
      title: "Quick sale and checkout",
      description: "Scan or search products, apply discounts, select payment types, and confirm receipts.",
      url: `${docsHubUrl}/sales/quick-sale-checkout`,
      badge: "Checkout",
    },
    {
      title: "Customers and store accounts",
      description: "Manage walk-in vs account customers and record balance-due store credit safely.",
      url: `${docsHubUrl}/customers/customers-and-store-credit`,
      badge: "Accounts",
    },
    {
      title: "Safe support screenshots",
      description: "How to redact sensitive customer and pricing information before requesting support.",
      url: `${docsHubUrl}/start/help-and-support`,
      badge: "Support",
    },
  ],
  operations: [
    {
      title: "Inventory intake and adjustments",
      description: "Receive stock batches, record costs, verify quantities, and perform cycle counts.",
      url: `${docsHubUrl}/inventory/inventory-intake-and-adjustments`,
      badge: "Stock",
    },
    {
      title: "Customers and credit records",
      description: "Keep contact profiles minimal while tracking store balances accurately.",
      url: `${docsHubUrl}/customers/customers-and-store-credit`,
      badge: "Balances",
    },
    {
      title: "DRX Changelog and release notes",
      description: "Review current release features, operational fixes, and platform improvements.",
      url: `${docsHubUrl}/CHANGELOG`,
      badge: "Updates",
    },
  ],
  troubleshoot: [
    {
      title: "Help and support procedures",
      description: "Step-by-step triage guide for blocked checkout, uncertain payments, or missing stock.",
      url: `${docsHubUrl}/start/help-and-support`,
      badge: "Troubleshoot",
    },
    {
      title: "Workspace and access recovery",
      description: "Resolve login mismatches, role permission barriers, and business switching issues.",
      url: `${docsHubUrl}/access/troubleshoot-workspaces-and-access`,
      badge: "Access",
    },
    {
      title: "Customer and credit troubleshooting",
      description: "Diagnose balance discrepancies and credit allocation blocks safely.",
      url: `${docsHubUrl}/customers/troubleshoot-customers-and-credit`,
      badge: "Credit",
    },
  ],
};

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
  const topic = normalizeHelpTopic(topicParam);
  const context = getHelpLibraryContext(topic);
  const guides = TOPIC_DOCS[topic] || TOPIC_DOCS.start;

  return (
    <div
      className="space-y-4"
      data-testid="docs-library-embed"
    >
      <div className="rounded-xl border border-white/10 bg-muted/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-accent/40 text-accent">
              Topic
            </Badge>
            <span className="text-sm font-medium">{context.label}</span>
          </div>
          <a
            href={docsHubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <span>Open Full Help Center</span>
            <ExternalLink className="h-3 w-3" />
          </a>
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

      <div
        data-testid="featurebase-help-embed"
        className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        {guides.map((guide) => (
          <Card key={guide.title} className="flex flex-col justify-between border-white/10 bg-card/60 hover:border-accent/30 transition-colors">
            <CardHeader className="space-y-2 pb-2">
              <div className="flex items-center justify-between gap-2">
                {guide.badge && (
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {guide.badge}
                  </Badge>
                )}
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-base leading-snug">{guide.title}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {guide.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <a
                href={guide.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" size="sm" className="w-full justify-between text-xs group">
                  <span>Read Guide</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-1">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
          Mintlify documentation connected
        </span>
        <a
          href={`${docsHubUrl}/start/help-and-support`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Need support?
        </a>
      </div>
    </div>
  );
}
