"use client";

import { Crown, Gift } from "lucide-react";

interface LoyaltyBadgeProps {
  tier: string;
  discount_rate: number;
  purchase_count: number;
}

export function LoyaltyBadge({
  tier,
  discount_rate,
  purchase_count,
}: LoyaltyBadgeProps) {
  if (tier === "none" || !tier) {
    return null;
  }

  const tierConfig = {
    silver: { color: "bg-slate-100 text-slate-900", icon: "✨" },
    gold: { color: "bg-yellow-100 text-yellow-900", icon: "👑" },
    platinum: { color: "bg-cyan-100 text-cyan-900", icon: "💎" },
  };

  const config =
    tierConfig[tier as keyof typeof tierConfig] || tierConfig.silver;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span className="capitalize">{tier} Member</span>
      {discount_rate > 0 && (
        <span className="text-xs opacity-75">
          {(discount_rate * 100).toFixed(1)}% off
        </span>
      )}
    </div>
  );
}
