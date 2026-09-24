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
    <div className="group flex flex-col h-full min-h-[250px] w-full rounded-[10px] border border-border bg-surface-elevated p-6 text-left transition-all duration-300 motion-safe:hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_12px_32px_rgba(204,255,0,0.07)]">
      <div className="flex size-10 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent mb-3 shrink-0 transition-transform duration-300 motion-safe:group-hover:scale-110">
        {icon}
      </div>

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
