import type { ReactNode } from "react";

interface EvidenceItemProps {
  icon: ReactNode;
  title: string;
  body: string;
}

export function EvidenceItem({ icon, title, body }: EvidenceItemProps) {
  return (
    <div className="flex flex-col border-t border-border pt-5 pb-4 text-left w-full h-[160px] md:h-[180px] lg:h-[160px]">
      <div className="size-6 text-accent mb-2 shrink-0">{icon}</div>

      <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-2">
        {title}
      </h3>

      <p className="text-[14px] font-normal leading-[20px] text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
