import Link from "next/link";
import { appWaitlistUrl } from "@/lib/app-links";

export function MarketingCtaBand() {
  return (
    <section
      className="w-full rounded-[8px] bg-accent p-8 md:p-10 lg:px-12 lg:py-10 text-[#0a0a0a] shadow-lg"
      aria-label="Get Started with DRX"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-10 text-left">
        <div className="flex-1 max-w-[640px]">
          <h2 className="font-display text-[28px] md:text-[32px] lg:text-[36px] font-bold leading-[36px] md:leading-[40px] lg:leading-[44px] tracking-[-0.5px] text-[#0a0a0a] mb-2">
            Run the next shift from one place.
          </h2>
          <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-[#0a0a0a]/90">
            Start with the work already on your list. No invented proof. No setup
            theatre.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            href={appWaitlistUrl}
            className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[6px] bg-[#121212] px-5 text-[14px] font-medium text-[#f5f5f5] hover:bg-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            Get started
          </Link>
          <Link
            href="#workflows"
            className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[6px] border border-[#121212] bg-transparent px-5 text-[14px] font-medium text-[#0a0a0a] hover:bg-black/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            See the product
          </Link>
        </div>
      </div>
    </section>
  );
}
