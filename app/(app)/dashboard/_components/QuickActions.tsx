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

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string; // Tailwind text color class like "text-[#4ADE80]"
  bgColor: string; // Tailwind bg color class like "bg-[#4ADE80]/10"
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
  color,
  bgColor,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex flex-col gap-3 hover:border-white/10 hover:bg-[#111] transition-all group"
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
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {description}
        </p>
      </div>
    </Link>
  );
}

export function QuickActions() {
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
        SECTION B: QUICK OPERATIONS
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ActionCard
          icon={ShoppingCart}
          title="Start Sale"
          description="New Transaction"
          href="/sales"
          color="text-[#4ADE80]"
          bgColor="bg-[#4ADE80]/10"
        />
        <ActionCard
          icon={PackagePlus}
          title="Intake Inventory"
          description="Add Stock"
          href="/inventory"
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <ActionCard
          icon={UserPlus}
          title="Add Customer"
          description="New Record"
          href="/customers"
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
        <ActionCard
          icon={CreditCard}
          title="Extend Credit"
          description="Front Product"
          href="/credit"
          color="text-orange-500"
          bgColor="bg-orange-500/10"
        />

        {/* Secondary Row */}
        <ActionCard
          icon={Receipt}
          title="Record Payment"
          description="Settle Balance"
          href="/credit"
          color="text-[#4ADE80]"
          bgColor="bg-[#4ADE80]/10"
        />
        <ActionCard
          icon={List}
          title="Low Stock List"
          description="View Items"
          href="/inventory"
          color="text-orange-500"
          bgColor="bg-orange-500/10"
        />
        <ActionCard
          icon={FileText}
          title="Recent Audit"
          description="Last 3 Months"
          href="/reports"
          color="text-gray-400"
          bgColor="bg-gray-400/10"
        />
        {/* Placeholder for symmetry or another action */}
        <div className="hidden md:block"></div>
      </div>
    </div>
  );
}
