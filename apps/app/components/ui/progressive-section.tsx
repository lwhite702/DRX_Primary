"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ProgressiveSectionProps {
  title?: string;
  description?: string;
  badge?: string | number | null;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function ProgressiveSection({
  title = "Additional options & details",
  description,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: ProgressiveSectionProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn("rounded-xl border border-white/10 bg-black/30 transition-all", className)}
    >
      <CollapsibleTrigger
        type="button"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {badge !== undefined && badge !== null && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-mono text-accent">
              {badge}
            </span>
          )}
          {description && (
            <span className="hidden sm:inline text-[11px] font-normal normal-case text-muted-foreground/70">
              — {description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-normal normal-case text-muted-foreground">
          <span>{isOpen ? "Hide details" : "Show details"}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            aria-hidden="true"
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent
        forceMount
        className={cn(
          "border-t border-white/5 p-4 space-y-4 transition-all duration-200",
          !isOpen && "data-[state=closed]:h-0 data-[state=closed]:p-0 data-[state=closed]:opacity-0 data-[state=closed]:pointer-events-none overflow-hidden"
        )}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
