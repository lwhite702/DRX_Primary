import React from "react";
import { Clock, ShieldCheck, FileText } from "lucide-react";

export function SecurityBadges() {
  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between group hover:bg-white/5 p-2 rounded transition-colors cursor-default">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
          <div>
            <p className="text-sm font-bold text-white">Auto-logout</p>
            <p className="text-xs text-muted-foreground">
              After 30 minutes of activity
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-[#1A1A1A] text-[#4ADE80] border border-[#4ADE80]/20 px-1.5 py-0.5 rounded">
          ENABLED
        </span>
      </div>

      <div className="flex items-center justify-between group hover:bg-white/5 p-2 rounded transition-colors cursor-default">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
          <div>
            <p className="text-sm font-bold text-white">Encryption</p>
            <p className="text-xs text-muted-foreground">
              End-to-end encrypted session
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-[#1A1A1A] text-[#4ADE80] border border-[#4ADE80]/20 px-1.5 py-0.5 rounded">
          ACTIVE
        </span>
      </div>

      <div className="flex items-center justify-between group hover:bg-white/5 p-2 rounded transition-colors cursor-default">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
          <div>
            <p className="text-sm font-bold text-white">Audit logging</p>
            <p className="text-xs text-muted-foreground">
              All actions are recorded
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-[#1A1A1A] text-[#4ADE80] border border-[#4ADE80]/20 px-1.5 py-0.5 rounded">
          ENABLED
        </span>
      </div>
    </div>
  );
}
