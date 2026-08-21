"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface TourProps {
  steps: TourStep[];
  onComplete: () => void;
  tourId: string;
}

const TOUR_RELEASED_EVENT = "drx:tour-released";
let activeTourId: string | null = null;

function removeHighlight(element: HTMLElement | null) {
  element?.classList.remove("tour-target-highlight");
  element?.removeAttribute("data-drx-tour-active");
}

export function Tour({ steps, onComplete, tourId }: TourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const targetElementRef = useRef<HTMLElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const storageKey = `drx_tour_${tourId}`;

  const releaseTour = useCallback(() => {
    if (activeTourId === tourId) {
      activeTourId = null;
      window.dispatchEvent(new CustomEvent(TOUR_RELEASED_EVENT));
    }
  }, [tourId]);

  const finishTour = useCallback(() => {
    removeHighlight(targetElementRef.current);
    targetElementRef.current = null;
    setTargetElement(null);
    setIsActive(false);
    window.localStorage.setItem(storageKey, "true");
    releaseTour();
    onComplete();
  }, [onComplete, releaseTour, storageKey]);

  useEffect(() => {
    if (!steps.length || window.localStorage.getItem(storageKey)) return;

    const tryToStart = () => {
      if (window.localStorage.getItem(storageKey)) return;
      if (activeTourId && activeTourId !== tourId) return;
      activeTourId = tourId;
      setCurrentStepIndex(0);
      setIsActive(true);
    };

    tryToStart();
    window.addEventListener(TOUR_RELEASED_EVENT, tryToStart);

    return () => {
      window.removeEventListener(TOUR_RELEASED_EVENT, tryToStart);
      removeHighlight(targetElementRef.current);
      if (activeTourId === tourId) {
        releaseTour();
      }
    };
  }, [releaseTour, steps.length, storageKey, tourId]);

  useEffect(() => {
    if (!isActive) return;

    const step = steps[currentStepIndex];
    if (!step) {
      finishTour();
      return;
    }

    removeHighlight(targetElementRef.current);
    targetElementRef.current = null;
    setTargetElement(null);

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const locateTarget = () => {
      const element = document.getElementById(step.targetId);
      if (element) {
        targetElementRef.current = element;
        setTargetElement(element);
        element.classList.add("tour-target-highlight");
        element.setAttribute("data-drx-tour-active", "true");
        const reduceMotion = window.matchMedia?.(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        element.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center",
        });
        return;
      }

      attempts += 1;
      if (attempts < 4) {
        timer = setTimeout(locateTarget, 150);
        return;
      }

      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((index) => index + 1);
      } else {
        finishTour();
      }
    };

    timer = setTimeout(locateTarget, 0);

    return () => {
      if (timer) clearTimeout(timer);
      removeHighlight(targetElementRef.current);
    };
  }, [currentStepIndex, finishTour, isActive, steps]);

  const virtualAnchorRef = useMemo(
    () => ({ current: targetElement as HTMLElement }),
    [targetElement],
  );

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((index) => index + 1);
      return;
    }
    finishTour();
  };

  const handleBack = () => {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  };

  const step = steps[currentStepIndex];
  if (!isActive || !step || !targetElement) return null;

  const titleId = `drx-tour-${tourId}-title`;
  const descriptionId = `drx-tour-${tourId}-description`;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 bg-black/55" aria-hidden="true" />
      <Popover
        open
        modal
        onOpenChange={(open) => {
          if (!open) finishTour();
        }}
      >
        <PopoverAnchor virtualRef={virtualAnchorRef} />
        <PopoverContent
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          side={step.position ?? "bottom"}
          sideOffset={12}
          collisionPadding={16}
          avoidCollisions
          sticky="always"
          hideWhenDetached
          updatePositionStrategy="always"
          className="z-50 w-[min(22rem,calc(100vw-2rem))] border-primary p-0 shadow-2xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            nextButtonRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <CardHeader className="pb-2">
            <CardTitle id={titleId} className="flex items-center justify-between gap-4 text-base">
              <span>{step.title}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                {currentStepIndex + 1} / {steps.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent id={descriptionId} className="text-sm text-muted-foreground">
            {step.description}
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-2 pt-0">
            <Button variant="ghost" size="sm" onClick={finishTour}>
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 ? (
                <Button variant="outline" size="sm" onClick={handleBack}>
                  Back
                </Button>
              ) : null}
              <Button ref={nextButtonRef} size="sm" onClick={handleNext}>
                {currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </CardFooter>
        </PopoverContent>
      </Popover>
    </>
  );
}
