"use client";

import * as React from "react";
import { cn } from "@deelrx/ui";

interface SystemStatusProps {
  status?: "ONLINE" | "OFFLINE" | "MAINTENANCE";
  className?: string;
}

export function SystemStatus({
  status = "ONLINE",
  className,
}: SystemStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            status === "ONLINE" ? "bg-neon-lime" : "bg-red-500",
          )}
        ></span>
        <span
          className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            status === "ONLINE" ? "bg-neon-lime" : "bg-red-500",
          )}
        ></span>
      </span>
      <span>SYSTEM {status}</span>
    </div>
  );
}
