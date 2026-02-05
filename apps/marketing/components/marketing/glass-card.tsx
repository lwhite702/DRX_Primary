"use client";

import * as React from "react";
import { cn } from "@deelrx/ui";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
}

export function GlassCard({
  children,
  className,
  active = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[1.5rem] border border-glass-border p-6",
        "bg-glass-bg backdrop-blur-md", // 16px blur handled by global CSS if bg-glass-bg doesn't cover it, but here we can force it
        "transition-all duration-500 ease-out",
        "hover:border-white/20 hover:shadow-[0_0_30px_rgba(204,255,0,0.05)]",
        active && "border-neon-lime/50 shadow-[0_0_30px_rgba(204,255,0,0.1)]",
        className,
      )}
      style={{
        backdropFilter: "blur(16px)",
      }}
      {...props}
    >
      {/* Floating animation container would go here if needed, but usually handled by parent or motion variants */}
      {children}
    </div>
  );
}
