import React from "react";
import { type ActivityItem } from "../_hooks/useDashboardData";
import { DollarSign, Package, CreditCard, User } from "lucide-react";
import Link from "next/link";

interface ActivityTimelineProps {
  activities: ActivityItem[];
  compact?: boolean;
}

const getIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "sale":
      return <DollarSign className="w-3 h-3" />;
    case "intake":
      return <Package className="w-3 h-3" />;
    case "credit":
      return <CreditCard className="w-3 h-3" />;
    case "customer":
      return <User className="w-3 h-3" />;
    default:
      return <DollarSign className="w-3 h-3" />;
  }
};

const getColor = (type: ActivityItem["type"]) => {
  switch (type) {
    case "sale":
      return "bg-success/10 text-success";
    case "intake":
      return "bg-blue-500/10 text-blue-500";
    case "credit":
      return "bg-warning/10 text-warning";
    case "customer":
      return "bg-info/10 text-info";
    default:
      return "bg-white/10 text-white";
  }
};

export function ActivityTimeline({ activities, compact = false }: ActivityTimelineProps) {
  if (!activities.length) return null;
  const visibleActivities = compact ? activities.slice(0, 5) : activities;

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.12)] md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
        Recent activity
      </div>

      <div className="space-y-1">
        {visibleActivities.map((item) => (
          <div
            key={item.id}
            className="group flex items-start gap-4 rounded-lg border border-transparent p-3 transition-colors hover:border-white/10 hover:bg-white/5"
          >
            <div className={`p-2 rounded-full shrink-0 ${getColor(item.type)}`}>
              {getIcon(item.type)}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">{item.title}</h4>
              <p className="text-xs text-white/75">
                {item.description}
              </p>
              <p className="mt-1 text-[10px] text-white/55">
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/reports"
        className="block w-full py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white"
      >
        View reports →
      </Link>
    </section>
  );
}
