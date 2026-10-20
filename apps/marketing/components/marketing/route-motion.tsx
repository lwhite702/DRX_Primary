"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function MarketingRouteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: reduceMotion ? 0 : 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduceMotion ? 0 : -2 }}
        transition={{
          duration: reduceMotion ? 0.08 : 0.18,
          ease: [0.2, 0.75, 0.25, 1],
        }}
        className="min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
