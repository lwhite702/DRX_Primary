import type { ReactNode } from "react";

interface EvidenceItemProps {
  icon: ReactNode;
  title: string;
  body: string;
}

export function EvidenceItem({ icon, title, body }: EvidenceItemProps) {
  return (
    <div className="group flex flex-col border-t border-border pt-5 pb-4 text-left w-full h-[170px] md:h-[190px] lg:h-[170px] transition-colors duration-200 hover:border-accent/40">
      <div className="flex size-9 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent mb-3 shrink-0 transition-transform duration-300 group-hover:scale-105">
        {icon}
      </div>

      <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-2">
        {title}
      </h3>

      <p className="text-[14px] font-normal leading-[20px] text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
