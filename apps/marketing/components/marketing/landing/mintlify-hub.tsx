"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock, Sparkles } from "lucide-react";

import {
  docsChangelogUrl,
  docsHelpdeskUrl,
  docsHubUrl,
  docsRoadmapUrl,
  supportEmail,
  supportMailto,
} from "@/lib/docs-links";

type UpdatesView = "changelog" | "roadmap" | "support";

const tabConfig: Array<{ id: UpdatesView; label: string }> = [
  { id: "changelog", label: "Changelog" },
  { id: "roadmap", label: "Planned Focus" },
  { id: "support", label: "Help & Support" },
];

const changelogEntries = [
  {
    version: "v0.9.4",
    tag: "Current Release",
    title: "Point-of-Sale Discounts & Web Onboarding Alignments",
    summary:
      "Added multi-surface POS percentage and flat-amount discounts with live totals calculation. Fixed iOS mutation type inference and onboarding wizard flows.",
    link: `${docsChangelogUrl}#0-9-4`,
  },
  {
    version: "v0.9.3",
    tag: "Compliance & Design",
    title: "10DLC SMS Compliance & Mobile-First Redesign",
    summary:
      "Added dedicated SMS Communication Consent workflow with strict privacy protections, brand-aligned headers, and responsive operator proof layouts.",
    link: `${docsChangelogUrl}#0-9-3`,
  },
  {
    version: "v0.9.2",
    tag: "Core Stability",
    title: "In-App Feedback, Security Headers & Mintlify Docs",
    summary:
      "Configured Sentry user feedback with screenshot capture, strict Content-Security-Policy headers, and migrated full knowledge center to Mintlify.",
    link: `${docsChangelogUrl}#0-9-2`,
  },
];

const roadmapEntries = [
  {
    status: "Active Work",
    title: "Native Android POS & Hardware Integration",
    description:
      "Bluetooth thermal receipt printing, physical barcode scanner pairing, and local transaction caching with automatic reconciliation.",
  },
  {
    status: "Planned",
    title: "Multi-Store Inventory Balancing & Transfers",
    description:
      "Inter-location transfers, multi-warehouse stock allocations, and consolidated chain-level sales and credit reporting.",
  },
  {
    status: "In Research",
    title: "Advanced Financial Reporting & Tax Exports",
    description:
      "Automated sales tax summary exports, category-level margin breakdowns, and certified compliance audit journal generation.",
  },
];

export function MintlifyHub() {
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
                <Link
                  href={docsRoadmapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-neon-lime hover:underline"
                >
                  <span>View Full Roadmap on Mintlify</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
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
                <span className="text-sm font-semibold text-white/90">Help Scout & Mintlify Support</span>
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

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-neon-lime">
                    <Sparkles className="h-4 w-4" />
                    <h3 className="font-semibold text-white text-sm">Help Scout Support</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-white/60">
                    Direct operator support handled through our dedicated Help Scout inbox. Reach our operations team directly with any setup or technical question.
                  </p>
                  <a
                    href={supportMailto}
                    className="inline-flex items-center gap-1 text-xs text-neon-lime hover:underline"
                  >
                    <span>{supportEmail}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-neon-lime">
                    <BookOpen className="h-4 w-4" />
                    <h3 className="font-semibold text-white text-sm">Mintlify Knowledge Center</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-white/60">
                    Step-by-step guides for inventory intake, quick sale checkout, customer accounts,
                    and offline operation are published in the Mintlify docs.
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

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-neon-lime">
                    <Sparkles className="h-4 w-4" />
                    <h3 className="font-semibold text-white text-sm">In-App User Feedback</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-white/60">
                    Logged-in operators can report bugs, suggest features, or submit feedback
                    directly from any screen via the in-app Sentry feedback trigger.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-white/50">
          Canonical documentation on Mintlify:
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
