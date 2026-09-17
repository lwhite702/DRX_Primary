"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock, Sparkles } from "lucide-react";

import {
  docsChangelogUrl,
  docsHelpdeskUrl,
  docsHubUrl,
} from "@/lib/featurebase-links";

type UpdatesView = "changelog" | "roadmap" | "support";

const tabConfig: Array<{ id: UpdatesView; label: string }> = [
  { id: "changelog", label: "Changelog" },
  { id: "roadmap", label: "Planned Focus" },
  { id: "support", label: "Help & Feedback" },
];

const changelogEntries = [
  {
    version: "v0.9.1",
    tag: "Current Release",
    title: "In-App User Feedback & Mintlify Knowledge Base",
    summary:
      "Integrated Sentry client user feedback widget with screenshot support. Migrated all documentation and help desk procedures to Mintlify.",
    link: `${docsChangelogUrl}#0-9-1`,
  },
  {
    version: "v0.9.0",
    tag: "Core Platform",
    title: "Convex-First Realtime Migration & Offline SQLite Layer",
    summary:
      "Transitioned reactive app state, real-time inventory adjustments, and checkout reconciliation to Convex.",
    link: `${docsChangelogUrl}#0-9-0`,
  },
  {
    version: "v0.8.0",
    tag: "Security",
    title: "Zero-PII Privacy Enclaves & Automated Retention",
    summary:
      "Scheduled privacy retention pipelines that permanently wipe unneeded customer identifiers on configurable timelines.",
    link: `${docsChangelogUrl}#0-8-0`,
  },
];

const roadmapEntries = [
  {
    status: "Active Work",
    title: "Store Credit & Ledger Rebalancing",
    description:
      "Fine-grained credit limit recommendations, balance auditing, and multi-tenant ledger verification.",
  },
  {
    status: "Planned",
    title: "Offline-First Mobile PWA & Native Sync",
    description:
      "Encrypted device-local catalog caching with background sync reconciliation on network reconnect.",
  },
  {
    status: "In Research",
    title: "Multi-Store Inventory Balancing",
    description:
      "Inter-location transfers, multi-warehouse stock allocations, and consolidated reporting.",
  },
];

export function FeaturebaseHub() {
  const [activeView, setActiveView] = useState<UpdatesView>("changelog");

  return (
    <section id="updates" className="mx-auto w-full max-w-6xl px-6 pb-20">
      <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-[16px] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="technical-label text-neon-lime">Product & Documentation Hub</p>
            <h2 className="mt-3 font-sans text-[clamp(2rem,4.2vw,3rem)] font-bold uppercase leading-[0.95] tracking-[-0.03em] text-white">
              Changelog, Roadmap, And Guides In One Place.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
              Track released capabilities, planned focus areas, and canonical documentation
              without leaving the DRX ecosystem.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabConfig.map((tab) => {
              const active = tab.id === activeView;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id)}
                  className={
                    "technical-label rounded-full border px-4 py-2 text-[10px] transition-colors " +
                    (active
                      ? "border-neon-lime/40 bg-neon-lime/10 text-neon-lime"
                      : "border-white/10 bg-black/35 text-white/70 hover:border-neon-lime/30 hover:text-neon-lime")
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/35 p-6 md:p-8">
          {activeView === "changelog" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm font-semibold text-white/90">Recent Platform Releases</span>
                <Link
                  href={docsChangelogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-neon-lime hover:underline"
                >
                  <span>Read Full Changelog on Mintlify</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {changelogEntries.map((entry) => (
                  <div
                    key={entry.version}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-neon-lime/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-neon-lime">{entry.version}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-white/60">
                          {entry.tag}
                        </span>
                      </div>
                      <h3 className="mt-3 font-medium text-white text-sm leading-snug">{entry.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-white/60">{entry.summary}</p>
                    </div>

                    <Link
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-xs text-white/70 hover:text-neon-lime transition-colors"
                    >
                      <span>Details</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "roadmap" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm font-semibold text-white/90">Upcoming Capabilities</span>
                <span className="text-xs text-white/50">Early Access Roadmap</span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {roadmapEntries.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-neon-lime" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neon-lime">
                        {item.status}
                      </span>
                    </div>
                    <h3 className="mt-3 font-medium text-white text-sm">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/60">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "support" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm font-semibold text-white/90">Operator Help & Feedback</span>
                <Link
                  href={docsHelpdeskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-neon-lime hover:underline"
                >
                  <span>Open Help & Support</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-neon-lime">
                    <Sparkles className="h-4 w-4" />
                    <h3 className="font-semibold text-white text-sm">In-App User Feedback</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-white/60">
                    Logged-in operators can report bugs, suggest features, or submit feedback
                    directly from any screen via the in-app Sentry feedback trigger. Screenshots
                    can be annotated before submitting.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-neon-lime">
                    <BookOpen className="h-4 w-4" />
                    <h3 className="font-semibold text-white text-sm">Mintlify Knowledge Center</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-white/60">
                    Step-by-step guides for inventory intake, quick sale checkout, customer accounts,
                    and offline operation are published in the DRX Help Center.
                  </p>
                  <Link
                    href={docsHubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-neon-lime hover:underline"
                  >
                    <span>Browse docs.deelrxcrm.com</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-white/50">
          Canonical documentation:
          <Link
            href={docsHubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-neon-lime hover:underline"
          >
            {docsHubUrl}
          </Link>
        </p>
      </div>
    </section>
  );
}
