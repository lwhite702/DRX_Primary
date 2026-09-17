import type { ReactNode } from "react";
import Link from "next/link";

interface CapabilityCardProps {
  icon: ReactNode;
  title: string;
  body: string;
  ctaText: string;
  ctaHref: string;
}

export function CapabilityCard({
  icon,
  title,
  body,
  ctaText,
  ctaHref,
}: CapabilityCardProps) {
  return (
    <div className="flex flex-col h-[240px] md:h-[280px] lg:h-[240px] w-full rounded-[8px] border border-border bg-surface-elevated p-6 text-left transition-colors duration-150 hover:border-white/20">
      <div className="size-6 text-accent mb-2 shrink-0">{icon}</div>

      <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-2.5">
        {title}
      </h3>

      <p className="text-[14px] font-normal leading-[20px] text-muted-foreground">
        {body}
      </p>

      <div className="mt-auto pt-2">
        <Link
          href={ctaHref}
          className="inline-flex min-h-[44px] items-center text-[14px] font-normal leading-[20px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
}
