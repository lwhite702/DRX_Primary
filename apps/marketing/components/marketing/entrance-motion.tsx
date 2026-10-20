"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef, type ReactNode } from "react";

export function MarketingEntrance({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const targets = root.querySelectorAll<HTMLElement>("[data-motion-entrance]");
    if (targets.length === 0) return;

    const entrance = animate(targets, {
      opacity: [0, 1],
      translateY: [14, 0],
      delay: stagger(70),
      duration: 620,
      ease: "outExpo",
    });

    return () => {
      entrance.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="contents">
      {children}
    </div>
  );
}
