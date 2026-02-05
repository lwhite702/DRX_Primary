"use client";

import * as React from "react";
import { cn } from "@deelrx/ui";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function NeonButton({
  children,
  className,
  fullWidth = false,
  ...props
}: NeonButtonProps) {
  return (
    <button
      className={cn(
        "relative group bg-neon-lime text-black font-bold text-lg uppercase tracking-wider rounded-full px-8 py-4",
        "shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all duration-300 ease-in-out",
        "hover:scale-105 hover:shadow-[0_0_30px_rgba(204,255,0,0.5)]",
        "active:scale-95",
        fullWidth ? "w-full" : "w-auto",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      {/* Internal shine effect */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-all duration-700 ease-in-out group-hover:left-[100%]" />
      </div>
    </button>
  );
}
