"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { X, Info } from "lucide-react";

interface TooltipGuideProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
}

/**
 * Contextual Tooltip Guide
 *
 * Shows a tooltip on first use of a feature. Tracks dismissal
 * state in localStorage to avoid showing repeatedly.
 */
export function TooltipGuide({
  id,
  title,
  description,
  children,
  placement = "bottom",
}: TooltipGuideProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if this tooltip has been dismissed
    const key = `drx_tooltip_${id}`;
    const isDismissed = localStorage.getItem(key);

    if (!isDismissed) {
      // Show tooltip after a brief delay
      setTimeout(() => {
        setDismissed(false);
        setOpen(true);
      }, 300);
    }
  }, [id]);

  const handleDismiss = () => {
    const key = `drx_tooltip_${id}`;
    localStorage.setItem(key, "true");
    setDismissed(true);
    setOpen(false);
  };

  if (dismissed) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={placement}
        className="w-80 p-4 bg-accent/10 border-accent/30"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleDismiss}
            size="sm"
            className="w-full bg-accent hover:bg-accent-dark text-black"
          >
            Got it
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Hook to manually trigger tooltip display
 */
export function useTooltipGuide(id: string) {
  const reset = () => {
    const key = `drx_tooltip_${id}`;
    localStorage.removeItem(key);
  };

  const dismiss = () => {
    const key = `drx_tooltip_${id}`;
    localStorage.setItem(key, "true");
  };

  return { reset, dismiss };
}
