import { cn } from "@deelrx/ui";

import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { PageViewTracker } from "./page-view-tracker";

export function PageFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <PageViewTracker />
      <div className="page-grid-overlay" />
      <div className="page-glow" />
      <SiteHeader />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-10 md:py-14">
        <div className={cn("rounded-[28px] border border-white/10 bg-black/35 p-6 md:p-8", className)}>
          {children}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
