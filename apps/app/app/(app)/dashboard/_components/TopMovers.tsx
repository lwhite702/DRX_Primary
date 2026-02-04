import React from "react";
import { type TopMover } from "../_hooks/useDashboardData";

interface TopMoversProps {
  movers: TopMover[];
  totalRevenue: number;
}

export function TopMovers({ movers, totalRevenue }: TopMoversProps) {
  if (!movers.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
          TOP MOVERS TODAY
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Gross Revenue (24h)
          </div>
          <div className="text-xl font-bold text-white">
            $
            {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#4ADE80] font-bold">+12.4%</div>
        </div>
      </div>

      <div className="space-y-1">
        {movers.map((mover, index) => (
          <div
            key={mover.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-black ${
                  index === 0
                    ? "bg-[#4ADE80]"
                    : index === 1
                      ? "bg-blue-500"
                      : index === 2
                        ? "bg-purple-500"
                        : "bg-orange-500"
                }`}
              >
                {index + 1}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{mover.name}</h4>
                <p className="text-[10px] text-muted-foreground">
                  {mover.category}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {mover.quantitySold} sold
              </div>
              <div className="text-[10px] text-muted-foreground">
                ${mover.revenue}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
