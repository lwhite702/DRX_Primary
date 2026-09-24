import Link from "next/link";
import { marketingContent } from "@/lib/marketing-content";
import { appWaitlistUrl } from "@/lib/app-links";

export function MarketingCtaBand() {
  return (
    <section
      className="relative w-full overflow-hidden rounded-[20px] bg-accent p-8 text-[#0a0a0a] shadow-[0_16px_44px_rgba(204,255,0,0.12)] md:p-10 lg:px-12 lg:py-12"
      aria-label="Get Started with DRX"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 size-80 rounded-full border border-black/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-1 top-0 h-full w-[38%] bg-[radial-gradient(ellipse_at_65%_30%,rgba(255,255,255,.24),transparent_68%)]" />
      <div className="relative flex flex-col justify-between gap-6 text-left md:flex-row md:items-center lg:gap-10">
        <div className="flex-1 max-w-[640px]">
          <h2 className="font-display text-[28px] md:text-[34px] lg:text-[38px] font-extrabold leading-[36px] md:leading-[42px] lg:leading-[46px] tracking-[-0.5px] text-[#0a0a0a] mb-2.5">
            {marketingContent.betaAccess.title}
          </h2>
          <p className="text-[15px] md:text-[17px] font-normal leading-[24px] md:leading-[26px] text-[#0a0a0a]/90">
            {marketingContent.betaAccess.lead}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            href={appWaitlistUrl}
            className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[10px] bg-black px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            {marketingContent.betaAccess.cta.label}
          </Link>
          <Link
            href="#workflows"
            className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[10px] border border-black/65 bg-black/[0.035] px-6 text-[14px] font-semibold text-black transition-colors hover:bg-black/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            See the product
          </Link>
        </div>
      </div>
    </section>
  );
}
