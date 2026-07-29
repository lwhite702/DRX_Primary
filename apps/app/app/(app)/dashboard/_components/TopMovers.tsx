import React from "react";
import { type TopMover } from "../_hooks/useDashboardData";
import { cn } from "@/lib/utils";

interface TopMoversProps {
  movers: TopMover[];
  totalRevenue: number;
  compact?: boolean;
}

export function TopMovers({ movers, totalRevenue, compact = false }: TopMoversProps) {
  if (!movers.length) return null;
  const visibleMovers = compact ? movers.slice(0, 4) : movers;

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] md:p-5">
      <div className="flex justify-between items-end">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
          TOP MOVERS TODAY
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/65">
            Gross Revenue (24h)
          </div>
          <div className="text-xl font-bold text-white">
            $
            {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {visibleMovers.map((mover, index) => (
          <div
            key={mover.id}
            className={cn(
              "flex items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-white/10 hover:bg-white/5",
              compact && "p-2.5",
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-black ${
                  index === 0
                    ? "bg-accent"
                    : index === 1
                      ? "bg-blue-500"
                      : index === 2
                        ? "bg-info"
                        : "bg-warning"
                }`}
              >
                {index + 1}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{mover.name}</h4>
                <p className="text-[10px] text-white/70">
                  {mover.category}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {mover.quantitySold} sold
              </div>
              <div className="text-[10px] text-white/70">
                ${mover.revenue}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
