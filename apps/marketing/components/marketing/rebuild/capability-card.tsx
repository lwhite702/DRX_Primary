import type { ReactNode } from "react";
import Link from "next/link";
import { WorkflowVisual, type WorkflowVisualKind } from "./product-proof";

interface CapabilityCardProps {
  icon: ReactNode;
  title: string;
  body: string;
  ctaText: string;
  ctaHref: string;
  visual: WorkflowVisualKind;
}

export function CapabilityCard({
  icon,
  title,
  body,
  ctaText,
  ctaHref,
  visual,
}: CapabilityCardProps) {
  return (
    <div className="group relative flex h-full min-h-[360px] w-full flex-col overflow-hidden rounded-[14px] border border-border bg-surface-elevated p-5 text-left transition-all duration-300 motion-safe:hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_48px_rgba(0,0,0,0.24)] sm:p-6">
      <WorkflowVisual kind={visual} />

      <div className="mb-3 flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent transition-transform duration-300 motion-safe:group-hover:scale-110">
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
          className="inline-flex min-h-[44px] items-center text-[14px] font-medium leading-[20px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
}
