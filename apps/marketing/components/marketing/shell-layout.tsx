"use client";

import * as React from "react";
import { cn } from "@deelrx/ui";

interface ShellLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ShellLayout({
  children,
  className,
  ...props
}: ShellLayoutProps) {
  return (
    <div className="relative min-h-screen w-full bg-obsidian flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <div
        className={cn(
          "relative w-full max-w-[1600px] min-h-[calc(100vh-4rem)] rounded-[2.5rem]",
          "bg-surface border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]",
          "overflow-hidden flex flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
