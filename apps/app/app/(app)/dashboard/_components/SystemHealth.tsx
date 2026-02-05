import React from "react";
import { type DashboardStats } from "../_hooks/useDashboardData";

interface SystemHealthProps {
  health: DashboardStats["systemHealth"];
}

export function SystemHealth({ health }: SystemHealthProps) {
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
        SYSTEM HEALTH
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#050505] border border-white/5 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">
              SYNC STATUS
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          </div>
          <div className="text-sm font-bold text-white">
            {health.syncStatus}
          </div>
          <div className="text-[10px] text-muted-foreground">All synced</div>
        </div>
        <div className="bg-[#050505] border border-white/5 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">
              BROKEN LINKS
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          </div>
          <div className="text-sm font-bold text-white">
            {health.brokenLinks}
          </div>
          <div className="text-[10px] text-muted-foreground">Transactions</div>
        </div>
        <div className="bg-[#050505] border border-white/5 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">
              LAST AUDIT
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
          </div>
          <div className="text-sm font-bold text-white">{health.lastAudit}</div>
          <div className="text-[10px] text-muted-foreground">Ago</div>
        </div>
        <div className="bg-[#050505] border border-white/5 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">
              LOCATION
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
          </div>
          <div className="text-sm font-bold text-white">{health.location}</div>
          <div className="text-[10px] text-muted-foreground">AE33-294</div>
        </div>
      </div>
    </div>
  );
}
