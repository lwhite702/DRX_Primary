"use client";

import Link from "next/link";
import {
  PackagePlus,
  ShoppingCart,
  Package,
  CreditCard,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InventoryMenuPage() {
  const menuItems = [
    {
      label: "INTAKE",
      description: "Add inventory stock",
      icon: PackagePlus,
      href: "/inventory/intake",
      color: "text-[#00F0FF]", // Neon Cyan
      bg: "bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20",
      borderColor: "border-[#00F0FF]/20",
      colSpan: "col-span-1 md:col-span-1",
    },
    {
      label: "POS",
      description: "Process sales",
      icon: ShoppingCart,
      href: "/sales",
      color: "text-[#BFFF00]", // Neon Lime
      bg: "bg-[#BFFF00]/10 hover:bg-[#BFFF00]/20",
      borderColor: "border-[#BFFF00]/20",
      colSpan: "col-span-1 md:col-span-1",
    },
    {
      label: "INVENTORY",
      description: "View & edit list",
      icon: Package,
      href: "/inventory",
      color: "text-[#FF0099]", // Neon Pink
      bg: "bg-[#FF0099]/10 hover:bg-[#FF0099]/20",
      borderColor: "border-[#FF0099]/20",
      colSpan: "col-span-1 md:col-span-1",
    },
    {
      label: "CREDIT",
      description: "Customer accounts",
      icon: CreditCard,
      href: "/customers",
      color: "text-[#FFD700]", // Neon Gold
      bg: "bg-[#FFD700]/10 hover:bg-[#FFD700]/20",
      borderColor: "border-[#FFD700]/20",
      colSpan: "col-span-1 md:col-span-1",
    },
    {
      label: "MORE",
      description: "Additional options",
      icon: MoreHorizontal,
      href: "/inventory", // Placeholder
      color: "text-muted-foreground",
      bg: "bg-muted/10 hover:bg-muted/20",
      borderColor: "border-border",
      colSpan: "col-span-2 md:col-span-2",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Select Operation Type
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-6 transition-all duration-300 active:scale-95",
                item.bg,
                item.borderColor,
                item.colSpan,
              )}
            >
              <div className="flex flex-col h-full justify-between gap-4">
                <div
                  className={cn(
                    "p-3 w-fit rounded-full bg-background/50 border border-white/5",
                    item.color,
                  )}
                >
                  <item.icon className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h2
                      className={cn(
                        "text-2xl font-bold tracking-tight",
                        item.color,
                      )}
                    >
                      {item.label}
                    </h2>
                    <ArrowRight
                      className={cn(
                        "w-5 h-5 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0",
                        item.color,
                      )}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
