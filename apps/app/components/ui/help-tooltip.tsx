"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { ReactNode } from "react";

interface HelpTooltipProps {
  content: string;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function HelpTooltip({
  content,
  children,
  side = "top",
}: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button
              type="button"
              className="inline-flex items-center justify-center p-1.5 -m-1.5 rounded-full text-muted-foreground hover:text-foreground focus:text-foreground focus:outline-none min-h-[36px] min-w-[36px] cursor-help"
              aria-label="Help information"
            >
              <HelpCircle className="h-5 w-5 md:h-4 md:w-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs p-3 bg-[#1e1e1e] border-white/10 text-foreground shadow-xl rounded-lg">
          <p className="text-xs md:text-sm leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
