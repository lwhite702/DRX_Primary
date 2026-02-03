import React from "react";
import { type ActivityItem } from "../_hooks/useDashboardData";
import { DollarSign, Package, CreditCard, User } from "lucide-react";

interface ActivityTimelineProps {
  activities: ActivityItem[];
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
      return "bg-[#4ADE80]/10 text-[#4ADE80]";
    case "intake":
      return "bg-blue-500/10 text-blue-500";
    case "credit":
      return "bg-orange-500/10 text-orange-500";
    case "customer":
      return "bg-purple-500/10 text-purple-500";
    default:
      return "bg-white/10 text-white";
  }
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities.length) return null;

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
        SECTION D: RECENT ACTIVITY TIMELINE
      </div>

      <div className="space-y-1">
        {activities.map((item) => (
          <div
            key={item.id}
            className="group p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 flex items-start gap-4"
          >
            <div className={`p-2 rounded-full shrink-0 ${getColor(item.type)}`}>
              {getIcon(item.type)}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">{item.title}</h4>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full text-[10px] font-bold text-muted-foreground hover:text-white py-2 text-center uppercase tracking-widest">
        View Full Activity Log →
      </button>
    </div>
  );
}
