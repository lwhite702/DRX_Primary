import React from "react";

export function DashboardHeader() {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
        OPERATOR DASHBOARD
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">
        WHAT'S MOVING TODAY
      </h1>
      <p className="text-muted-foreground text-xs md:text-sm">
        Real-time snapshot of your operation. All numbers reflect current tenant
        scope and privacy preset.
      </p>
    </div>
  );
}
