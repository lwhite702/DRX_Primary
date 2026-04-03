"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  featurebaseChangelogUrl,
  featurebaseHelpdeskUrl,
  featurebaseRoadmapUrl,
} from "@/lib/featurebase-links";

type FeaturebaseView = "feedback" | "changelog" | "roadmap";

const featurebasePaths: Record<FeaturebaseView, string> = {
  feedback: "/",
  changelog: "/changelog",
  roadmap: "/roadmap",
};

const tabConfig: Array<{ id: FeaturebaseView; label: string }> = [
  { id: "feedback", label: "Feedback" },
  { id: "changelog", label: "Changelog" },
  { id: "roadmap", label: "Roadmap" },
];

const fallbackLinks: Record<FeaturebaseView, string> = {
  feedback: featurebaseHelpdeskUrl,
  changelog: featurebaseChangelogUrl,
  roadmap: featurebaseRoadmapUrl,
};

function viewFromPathname(pathname: string): FeaturebaseView {
  if (pathname.includes("/roadmap")) return "roadmap";
  if (pathname.includes("/changelog")) return "changelog";
  return "feedback";
}

export function FeaturebaseHub() {
  const pathname = usePathname();
  const [activeView, setActiveView] = useState<FeaturebaseView>(() =>
    viewFromPathname(pathname),
  );
  const embedContainerRef = useRef<HTMLDivElement | null>(null);

  const activePath = useMemo(() => featurebasePaths[activeView], [activeView]);

  useEffect(() => {
    setActiveView(viewFromPathname(pathname));
  }, [pathname]);

  useEffect(() => {
    const win = window as typeof window & {
      Featurebase?: (...args: unknown[]) => void;
    };

    if (typeof win.Featurebase !== "function") {
      win.Featurebase = function featurebaseQueueShim(...args: unknown[]) {
        (win.Featurebase as unknown as { q?: unknown[][] }).q =
          (win.Featurebase as unknown as { q?: unknown[][] }).q || [];
        (win.Featurebase as unknown as { q: unknown[][] }).q.push(args);
      };
    }

    if (embedContainerRef.current) {
      embedContainerRef.current.innerHTML = "";
    }

    win.Featurebase("init_embed_widget", {
      organization: "drx",
      embedOptions: {
        path: activePath,
        routeSyncingBasePath: "/updates",
      },
      stylingOptions: {
        theme: "dark",
        hideMenu: false,
        hideLogo: false,
      },
    });
  }, [activePath]);

  return (
    <section id="updates" className="mx-auto w-full max-w-6xl px-6 pb-20">
      <Script src="https://do.featurebase.app/js/sdk.js" id="featurebase-sdk" strategy="afterInteractive" />

      <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-[16px] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="technical-label text-neon-lime">Live Product Board</p>
            <h2 className="mt-3 font-sans text-[clamp(2rem,4.2vw,3rem)] font-bold uppercase leading-[0.95] tracking-[-0.03em] text-white">
              Feedback, Changelog, And Roadmap In One Panel.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
              Track what is shipping, what is planned, and what operators are asking for
              without leaving the DRX updates workspace.
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

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/35">
          <div ref={embedContainerRef} data-featurebase-embed className="min-h-[760px] w-full" />
        </div>

        <p className="mt-4 text-xs text-white/50">
          If the embed is blocked by network policy, open directly:
          <Link
            href={fallbackLinks[activeView]}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-neon-lime hover:underline"
          >
            {fallbackLinks[activeView]}
          </Link>
        </p>
      </div>
    </section>
  );
}
