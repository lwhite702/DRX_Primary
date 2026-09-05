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
  const actions: ActionCardProps[] =
    preset === "inventory"
      ? [
          {
            icon: PackagePlus,
            title: "Receive Stock",
            description: "Inventory intake",
            href: "/inventory/intake",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
          },
          {
            icon: SlidersHorizontal,
            title: "Adjust Stock",
            description: "Correct on-hand counts",
            href: "/inventory/adjust",
            color: "text-warning",
            bgColor: "bg-warning/10",
          },
          {
            icon: ClipboardCheck,
            title: "Inventory Audit",
            description: "Review stock events",
            href: "/inventory/audit",
            color: "text-success",
            bgColor: "bg-success/10",
          },
          {
            icon: PackageSearch,
            title: "Find Product",
            description: "Search inventory",
            href: "/inventory",
            color: "text-accent",
            bgColor: "bg-accent/10",
          },
        ]
      : preset === "checkout"
        ? [
            {
              icon: ShoppingCart,
              title: "Start Sale",
              description: "New transaction",
              href: "/pos/sale",
              color: "text-accent",
              bgColor: "bg-accent/10",
            },
            {
              icon: UserPlus,
              title: "Add Customer",
              description: "New customer record",
              href: "/customers",
              color: "text-info",
              bgColor: "bg-info/10",
            },
            {
              icon: Receipt,
              title: "Record Payment",
              description: "Settle a balance",
              href: "/credit",
              color: "text-success",
              bgColor: "bg-success/10",
            },
            {
              icon: FileText,
              title: "Sales Reports",
              description: "Review completed sales",
              href: "/reports",
              color: "text-gray-400",
              bgColor: "bg-gray-400/10",
            },
          ]
        : [
            {
              icon: ShoppingCart,
              title: "Start Sale",
              description: "New transaction",
              href: "/pos/sale",
              color: "text-accent",
              bgColor: "bg-accent/10",
            },
            {
              icon: PackagePlus,
              title: "Receive Stock",
              description: "Inventory intake",
              href: "/inventory/intake",
              color: "text-blue-500",
              bgColor: "bg-blue-500/10",
            },
            {
              icon: UserPlus,
              title: "Add Customer",
              description: "New customer record",
              href: "/customers",
              color: "text-info",
              bgColor: "bg-info/10",
            },
            {
              icon: CreditCard,
              title: "Manage Credit",
              description: "Balances and payments",
              href: "/credit",
              color: "text-warning",
              bgColor: "bg-warning/10",
            },
          ];

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
        Common actions
      </div>
      <p className="text-xs text-white/70">
        The four most-used tasks for this dashboard view.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <ActionCard key={action.href + action.title} {...action} compact={compact} />
        ))}
      </div>
    </section>
  );
}
