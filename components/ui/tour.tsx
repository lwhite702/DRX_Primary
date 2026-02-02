"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TourStep {
  targetId: string; // ID of the element to attach to
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface TourProps {
  steps: TourStep[];
  onComplete: () => void;
  tourId: string; // Unique ID for local storage persistence
}

export function Tour({ steps, onComplete, tourId }: TourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  // Check if tour already completed
  useEffect(() => {
    const completed = localStorage.getItem(`drx_tour_${tourId}`);
    if (completed) return;

    // Start tour
    setIsOpen(true);
  }, [tourId]);

  // Find target element
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure render
    const timer = setTimeout(() => {
      const step = steps[currentStepIndex];
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetElement(el);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Highlight effect could go here (e.g. outline)
        el.classList.add("ring-4", "ring-primary/50", "transition-all");
      } else {
        console.warn(`Tour target ${step.targetId} not found`);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isOpen, steps]);

  // Cleanup highlight on step change
  useEffect(() => {
    return () => {
      if (targetElement) {
        targetElement.classList.remove(
          "ring-4",
          "ring-primary/50",
          "transition-all",
        );
      }
    };
  }, [targetElement]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setIsOpen(false);
    localStorage.setItem(`drx_tour_${tourId}`, "true");
    if (targetElement) {
      targetElement.classList.remove(
        "ring-4",
        "ring-primary/50",
        "transition-all",
      );
    }
    onComplete();
  };

  const handleSkip = () => {
    finishTour();
  };

  if (!isOpen || !steps[currentStepIndex]) return null;

  const step = steps[currentStepIndex];

  // We are "hacking" the Popover by attaching it to the target element if possible.
  // Actually, Shadcn Popover requires a Trigger as a child.
  // Since we can't easily wrap the existing UI elements without intrusive changes,
  // a "Portal" or "Overlay" approach is better for a Tour.
  // However, for simplicity and speed, let's use a fixed position card relative to viewport or
  // just a floating card if we can't do complex positioning easily.

  // Revised approach: Floating fixed card at bottom/center or near element if we calculate pos.
  // Better yet: Just a fixed overlay card is easiest for "MVP" tour.
  // BUT user asked for "Tour".

  // Let's try to find rect and position absolute.
  const rect = targetElement?.getBoundingClientRect();

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 50,
    maxWidth: 300,
  };

  // Simple positioning logic
  if (rect) {
    // Default bottom
    style.top = rect.bottom + 10;
    style.left = rect.left;

    // Adjust if off screen
    if (style.left + 300 > window.innerWidth) {
      style.left = window.innerWidth - 320;
    }
  } else {
    // Center if no target found (fallback)
    style.top = "50%";
    style.left = "50%";
    style.transform = "translate(-50%, -50%)";
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Box shadow overlay or darkening? optional */}
      <Card
        className="pointer-events-auto shadow-2xl border-primary"
        style={style}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex justify-between items-center">
            {step.title}
            <span className="text-xs text-muted-foreground font-normal">
              {currentStepIndex + 1} / {steps.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{step.description}</CardContent>
        <CardFooter className="flex justify-between pt-0">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip
          </Button>
          <Button size="sm" onClick={handleNext}>
            {currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
