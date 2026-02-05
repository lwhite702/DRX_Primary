import React from "react";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Tablet, Laptop } from "lucide-react";

export type PrivacyStatus = "MAX SECURE" | "BALANCED" | "ACTIVE" | "PRIVATE";
export type DeviceType =
  | "iPhone 15 Pro"
  | "Web Desktop"
  | "iPad Pro"
  | "Android Phone";

export interface WorkspaceCardProps {
  id: string;
  name: string;
  tenantId: string; // e.g. "TENANT 22 - GSC-2024-1066"
  lastAccess: string; // e.g. "12 minutes ago"
  location: string;
  device: DeviceType;
  privacyStatus: PrivacyStatus[];
  initials: string;
  color: string; // e.g. "bg-green-500"
  isActive?: boolean;
  onSelect: () => void;
}

const getDeviceIcon = (device: string) => {
  if (
    device.toLowerCase().includes("iphone") ||
    device.toLowerCase().includes("android")
  )
    return <Smartphone className="w-3 h-3" />;
  if (device.toLowerCase().includes("ipad"))
    return <Tablet className="w-3 h-3" />;
  if (device.toLowerCase().includes("desktop"))
    return <Monitor className="w-3 h-3" />;
  return <Laptop className="w-3 h-3" />;
};

export function WorkspaceCard({
  name,
  tenantId,
  lastAccess,
  location,
  device,
  privacyStatus,
  initials,
  color,
  isActive,
  onSelect,
}: WorkspaceCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left group relative overflow-hidden transition-all duration-300",
        "bg-[#0A0A0A] border rounded-xl p-0",
        isActive
          ? "border-[#4ADE80] shadow-[0_0_20px_rgba(74,222,128,0.1)]"
          : "border-white/5 hover:border-white/10 hover:bg-[#111111]",
      )}
    >
      {/* Active Indicator Strip */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4ADE80]" />
      )}

      <div className="p-5 flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center text-lg font-bold text-white",
              color,
            )}
          >
            {initials}
          </div>

          <div>
            <h3 className="font-bold text-lg text-white mb-0.5 group-hover:text-white/90 transition-colors">
              {name}
            </h3>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
              {tenantId}
            </p>

            <div className="flex flex-wrap gap-2">
              {privacyStatus.map((status) => (
                <div
                  key={status}
                  className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm flex items-center gap-1.5",
                    status === "ACTIVE" &&
                      "bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20",
                    status === "BALANCED" &&
                      "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                    status === "MAX SECURE" &&
                      "bg-red-500/10 text-red-500 border border-red-500/20",
                    status === "PRIVATE" &&
                      "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
                  )}
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full animate-pulse",
                      status === "ACTIVE" && "bg-[#4ADE80]",
                      status === "BALANCED" && "bg-blue-500",
                      status === "MAX SECURE" && "bg-red-500",
                      status === "PRIVATE" && "bg-yellow-500",
                    )}
                  />
                  {status}
                </div>
              ))}
            </div>
          </div>
        </div>

        {isActive && (
          <div className="bg-[#4ADE80]/10 text-[#4ADE80] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-[#4ADE80]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
            TARGET
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="border-t border-white/5 bg-white/[0.02] p-4 flex items-center justify-between text-xs text-muted-foreground/60 font-mono">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase tracking-wider opacity-50">
            Last Access
          </span>
          <span className="text-muted-foreground">{lastAccess}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase tracking-wider opacity-50">
            Location
          </span>
          <span className="text-muted-foreground">{location}</span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[8px] uppercase tracking-wider opacity-50">
            Device
          </span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {getDeviceIcon(device)}
            {device}
          </div>
        </div>
      </div>
    </button>
  );
}
