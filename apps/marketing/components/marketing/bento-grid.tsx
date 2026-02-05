"use client";

import { cn } from "@deelrx/ui";
import { GlassCard } from "@/components/marketing/glass-card";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  span = 1,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  span?: 1 | 2 | 3 | 4;
}) {
  const spanClasses = {
    1: "md:col-span-1",
    2: "md:col-span-2",
    3: "md:col-span-3",
    4: "md:col-span-4",
  };

  return (
    <GlassCard
      className={cn(
        "row-span-1 flex flex-col justify-between space-y-4 group",
        spanClasses[span],
        className,
      )}
    >
      {header}
      <div className="group-hover:translate-x-2 transition duration-200">
        <div className="text-neon-lime mb-2">{icon}</div>
        <div className="font-sans font-bold text-lg text-text-primary mb-2">
          {title}
        </div>
        <div className="font-sans font-normal text-text-muted text-sm leading-relaxed">
          {description}
        </div>
      </div>
    </GlassCard>
  );
}
