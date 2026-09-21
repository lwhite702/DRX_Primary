import Link from "next/link";
import { marketingContent } from "@/lib/marketing-content";
import { appWaitlistUrl } from "@/lib/app-links";

export function MarketingCtaBand() {
  return (
    <section
      className="w-full rounded-[14px] bg-accent p-8 md:p-10 lg:px-12 lg:py-12 text-[#0a0a0a] shadow-[0_20px_50px_rgba(204,255,0,0.18)] transition-all duration-300 hover:shadow-[0_24px_60px_rgba(204,255,0,0.24)]"
      aria-label="Get Started with DRX"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-10 text-left">
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
            className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[10px] bg-black px-6 text-[14px] font-semibold text-white hover:bg-[#1a1a1a] hover:scale-[1.02] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            {marketingContent.betaAccess.cta.label}
          </Link>
          <Link
            href="#workflows"
            className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[10px] border-2 border-black/80 bg-transparent px-6 text-[14px] font-semibold text-black hover:bg-black/10 hover:scale-[1.02] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            See the product
          </Link>
        </div>
      </div>
    </section>
  );
}
