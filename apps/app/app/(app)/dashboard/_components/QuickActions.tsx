import React from "react";
import {
  ShoppingCart,
  PackagePlus,
  UserPlus,
  CreditCard,
  Receipt,
  List,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DashboardViewPreset } from "@/lib/auth/dashboard-preferences";

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string;
  bgColor: string;
  compact?: boolean;
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
  color,
  bgColor,
  compact = false,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-xl border border-white/10 bg-surface transition-all duration-200 hover:border-white/20 hover:bg-card",
        compact ? "gap-2 p-3" : "gap-3 p-4",
      )}
    >
      <div
        className={cn(
          "p-2 rounded-md w-fit transition-colors",
          bgColor,
          color,
          "group-hover:bg-opacity-20",
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white mb-0.5">{title}</h3>
        <p className="text-[10px] uppercase tracking-wide text-white/75">
          {description}
        </p>
      </div>
    </Link>
  );
}

export function QuickActions({
  preset = "operations",
  compact = false,
}: {
  preset?: DashboardViewPreset;
  compact?: boolean;
}) {
  const checkoutMode = preset === "checkout";

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
        SECTION B: QUICK OPERATIONS
      </div>
      <p className="text-xs text-white/70">
        High-frequency actions for counter staff and operators.
      </p>

      <div
        className={cn(
          "grid gap-4",
          checkoutMode
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
            : "grid-cols-2 md:grid-cols-4",
        )}
      >
        <ActionCard
          icon={ShoppingCart}
          title="Start Sale"
          description="New Transaction"
          href="/sales"
          color="text-accent"
          bgColor="bg-accent/10"
          compact={compact}
        />
        <ActionCard
          icon={PackagePlus}
          title="Intake Inventory"
          description="Add Stock"
          href="/inventory"
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          compact={compact}
        />
        <ActionCard
          icon={UserPlus}
          title="Add Customer"
          description="New Record"
          href="/customers"
          color="text-info"
          bgColor="bg-info/10"
          compact={compact}
        />
        <ActionCard
          icon={CreditCard}
          title="Extend Credit"
          description="Front Product"
          href="/credit"
          color="text-warning"
          bgColor="bg-warning/10"
          compact={compact}
        />

        {/* Secondary Row */}
        <ActionCard
          icon={Receipt}
          title="Record Payment"
          description="Settle Balance"
          href="/credit"
          color="text-success"
          bgColor="bg-success/10"
          compact={compact}
        />
        <ActionCard
          icon={List}
          title="Low Stock List"
          description="View Items"
          href="/inventory"
          color="text-warning"
          bgColor="bg-warning/10"
          compact={compact}
        />
        <ActionCard
          icon={FileText}
          title="Recent Audit"
          description="Last 3 Months"
          href="/reports"
          color="text-gray-400"
          bgColor="bg-gray-400/10"
          compact={compact}
        />
        {!checkoutMode ? <div className="hidden md:block" /> : null}
      </div>
    </section>
  );
}
