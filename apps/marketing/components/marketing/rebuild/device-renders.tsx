import Image from "next/image";
import { Lock } from "lucide-react";

interface IphoneRenderProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  badge?: {
    label: string;
    active?: boolean;
  };
}

export function IphoneRender({
  src,
  alt,
  priority = false,
  className = "",
  badge,
}: IphoneRenderProps) {
  return (
    <div
      className={`relative rounded-[38px] sm:rounded-[46px] p-[9px] sm:p-[11px] bg-gradient-to-b from-[#404040] via-[#222222] to-[#121212] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_28px_rgba(204,255,0,0.06)] border border-white/20 ring-1 ring-black/80 transition-all duration-300 hover:border-accent/40 ${className}`}
    >
      {/* Outer Titanium Bezel Highlights */}
      <div className="absolute inset-0 rounded-[38px] sm:rounded-[46px] pointer-events-none border border-white/10" />

      {/* Screen Inner Chassis */}
      <div className="relative rounded-[30px] sm:rounded-[36px] overflow-hidden bg-black aspect-[390/844] max-w-full flex flex-col justify-between">
        {/* Dynamic Island */}
        <div
          aria-hidden="true"
          className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 w-[84px] sm:w-[94px] h-[22px] sm:h-[24px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md border border-white/10 pointer-events-none"
        >
          {/* Camera Lens */}
          <div className="size-2 rounded-full bg-[#1e293b] border border-[#334155]/60" />
          {/* Privacy / Sensor Dot */}
          <div className="size-1.5 rounded-full bg-emerald-500/80" />
        </div>

        {/* Optional Floating Status Badge */}
        {badge && (
          <div
            className="absolute top-9 right-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/80 border border-white/20 px-2.5 py-0.5 text-[9px] font-mono font-medium text-white shadow-lg backdrop-blur-sm"
          >
            {badge.active && (
              <span className="relative flex size-1.5">
                <span className="animate-beacon-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-accent" />
              </span>
            )}
            <span>{badge.label}</span>
          </div>
        )}

        {/* Real Screenshot Image */}
        <div className="relative w-full h-full overflow-hidden">
          <Image
            src={src}
            alt={alt}
            width={390}
            height={844}
            className="w-full h-full object-cover object-top select-none"
            priority={priority}
          />
        </div>

        {/* Glass Screen Sheen Reflection */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.035] to-transparent pointer-events-none z-20"
        />

        {/* Bottom Home Indicator Bar */}
        <div
          aria-hidden="true"
          className="w-24 sm:w-28 h-1 bg-white/35 rounded-full absolute bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        />
      </div>
    </div>
  );
}

interface BrowserRenderProps {
  src: string;
  alt: string;
  url?: string;
  priority?: boolean;
  className?: string;
  badge?: {
    label: string;
    active?: boolean;
  };
}

export function BrowserRender({
  src,
  alt,
  url = "drx.deelrx.com/dashboard",
  priority = false,
  className = "",
  badge,
}: BrowserRenderProps) {
  return (
    <div
      className={`relative rounded-[14px] sm:rounded-[16px] overflow-hidden border border-white/20 bg-[#121212] shadow-[0_25px_65px_-15px_rgba(0,0,0,0.85),0_0_30px_rgba(204,255,0,0.06)] ring-1 ring-white/10 transition-all duration-300 hover:border-accent/40 ${className}`}
    >
      {/* Titlebar / Chrome */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#1b1b1b] border-b border-white/10 shrink-0">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
          <div className="size-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/80" />
          <div className="size-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/80" />
          <div className="size-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/80" />
        </div>

        {/* Browser URL Pill */}
        <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-black/60 border border-white/10 rounded-md text-[11px] font-mono text-text-secondary max-w-[280px] w-full truncate">
          <Lock className="size-2.5 text-accent shrink-0" aria-hidden="true" />
          <span className="truncate">{url}</span>
        </div>

        {/* Optional Right Pill / Badge */}
        <div className="shrink-0 flex items-center">
          {badge ? (
            <span className="inline-flex items-center gap-1 rounded bg-accent/15 border border-accent/30 px-1.5 py-0.5 text-[9px] font-mono font-medium text-accent">
              {badge.active && (
                <span className="size-1 rounded-full bg-accent animate-pulse" />
              )}
              {badge.label}
            </span>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* Screen Frame */}
      <div className="relative w-full aspect-[1440/1024] bg-black overflow-hidden">
        <Image
          src={src}
          alt={alt}
          width={1440}
          height={1024}
          className="w-full h-full object-cover object-top select-none"
          priority={priority}
        />

        {/* Subtle Glass Sheen */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.025] to-transparent pointer-events-none z-10"
        />
      </div>
    </div>
  );
}
