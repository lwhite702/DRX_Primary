import React from "react";
import {
  ShoppingCart,
  PackagePlus,
  UserPlus,
  CreditCard,
  Receipt,
  FileText,
  ClipboardCheck,
  SlidersHorizontal,
  PackageSearch,
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
        "group flex min-w-0 flex-col rounded-[var(--drx-radius-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border border-white/10 bg-surface transition-all duration-200 hover:border-white/20 hover:bg-card",
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
        <p className="text-sm leading-relaxed text-muted-foreground">
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
  const actions: ActionCardProps[] =
    preset === "inventory"
      ? [
          {
            icon: PackagePlus,
            title: "Add stock",
            description: "Add what came in",
            href: "/inventory/intake",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
          },
          {
            icon: SlidersHorizontal,
            title: "Fix count",
            description: "Correct what’s on hand",
            href: "/inventory/adjust",
            color: "text-warning",
            bgColor: "bg-warning/10",
          },
          {
            icon: ClipboardCheck,
            title: "Check stock",
            description: "Review stock history",
            href: "/inventory/audit",
            color: "text-success",
            bgColor: "bg-success/10",
          },
          {
            icon: PackageSearch,
            title: "Find product",
            description: "Search products",
            href: "/inventory",
            color: "text-accent",
            bgColor: "bg-accent/10",
          },
        ]
      : preset === "checkout"
        ? [
            {
              icon: ShoppingCart,
              title: "New sale",
              description: "Add a sale",
              href: "/pos/sale",
              color: "text-accent",
              bgColor: "bg-accent/10",
            },
            {
              icon: UserPlus,
              title: "Add customer",
              description: "Save a customer",
              href: "/customers",
              color: "text-info",
              bgColor: "bg-info/10",
            },
            {
              icon: Receipt,
              title: "Record payment",
              description: "Settle a balance",
              href: "/credit",
              color: "text-success",
              bgColor: "bg-success/10",
            },
            {
              icon: FileText,
              title: "Reports",
              description: "Check saved sales",
              href: "/reports",
              color: "text-gray-400",
              bgColor: "bg-gray-400/10",
            },
          ]
        : [
            {
              icon: ShoppingCart,
              title: "New sale",
              description: "Add a sale",
              href: "/pos/sale",
              color: "text-accent",
              bgColor: "bg-accent/10",
            },
            {
              icon: PackagePlus,
              title: "Add stock",
              description: "Add what came in",
              href: "/inventory/intake",
              color: "text-blue-500",
              bgColor: "bg-blue-500/10",
            },
            {
              icon: UserPlus,
              title: "Add customer",
              description: "Save a customer",
              href: "/customers",
              color: "text-info",
              bgColor: "bg-info/10",
            },
            {
              icon: CreditCard,
              title: "Payments",
              description: "Balances and payments",
              href: "/credit",
              color: "text-warning",
              bgColor: "bg-warning/10",
            },
          ];

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
        Quick actions
      </div>
      <p className="text-xs text-white/70">
        Get to the work you do most.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <ActionCard
            key={action.href + action.title}
            {...action}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}
