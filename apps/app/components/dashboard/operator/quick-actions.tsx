"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Package,
  CreditCard,
  MoreHorizontal,
  ScanLine,
  Settings,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex flex-col gap-1 mb-6">
        <h2 className="headline-text text-lg">Quick Actions</h2>
        <p className="text-muted-foreground text-sm">
          Common operational tasks.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <ActionButton label="Inventory" icon={Package} href="/inventory" />
        <ActionButton label="Credit" icon={CreditCard} href="/credit" />
        <ActionButton
          label="Quick POS"
          icon={ScanLine}
          href="/pos/sale"
        />
        <ActionButton
          label="Add Customer"
          icon={UserPlus}
          href="/customers/new" // Assuming this route, fallback to /customers
        />
        <ActionButton
          label="Settings"
          icon={Settings}
          href="/settings"
          variant="secondary"
        />
        <ActionButton
          label="More"
          icon={MoreHorizontal}
          href="/dashboard" // Fallback or expanded menu
          variant="ghost"
        />
      </div>
    </Card>
  );
}

function ActionButton({
  label,
  icon: Icon,
  href,
  variant = "default",
}: {
  label: string;
  icon: any;
  href: string;
  variant?: "default" | "secondary" | "ghost";
}) {
  return (
    <Button
      variant="outline"
      className={cn(
        "h-24 flex flex-col gap-3 items-center justify-center border-dashed border-2 hover:border-solid hover:bg-accent/5 hover:text-accent-foreground transition-all group",
        {
          "border-border": variant === "default",
          "border-muted": variant === "secondary",
          "border-transparent bg-muted/20 hover:bg-muted/30":
            variant === "ghost",
        },
      )}
      asChild
    >
      <Link href={href}>
        <div className="p-2 rounded-full bg-background border border-border group-hover:border-accent/50 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-semibold text-xs tracking-wide uppercase">
          {label}
        </span>
      </Link>
    </Button>
  );
}
