import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { PageViewTracker } from "./page-view-tracker";

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black text-foreground">
      <PageViewTracker />
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-6 py-10 md:py-14">{children}</div>
      <SiteFooter />
    </main>
  );
}
