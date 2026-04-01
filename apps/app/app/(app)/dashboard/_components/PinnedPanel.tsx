"use client";

import React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ALL_PINNED_ITEM_IDS,
  type DashboardViewPreset,
  type PinnedPanelItemId,
} from "@/lib/auth/dashboard-preferences";

type PinnedPanelProps = {
  preset: DashboardViewPreset;
  pinnedItemIds: PinnedPanelItemId[];
  saving?: boolean;
  onChange: (next: PinnedPanelItemId[]) => void | Promise<unknown>;
};

type PinItem = {
  id: PinnedPanelItemId;
  label: string;
  description: string;
  href: string;
};

const PIN_ITEMS: Record<PinnedPanelItemId, PinItem> = {
  "quick-sale": {
    id: "quick-sale",
    label: "Quick Sale",
    description: "Fast ring-up",
    href: "/pos/sale",
  },
  sales: {
    id: "sales",
    label: "Sales",
    description: "Transactions",
    href: "/sales",
  },
  inventory: {
    id: "inventory",
    label: "Inventory",
    description: "Stock & intake",
    href: "/inventory",
  },
  customers: {
    id: "customers",
    label: "Customers",
    description: "CRM records",
    href: "/customers",
  },
  credit: {
    id: "credit",
    label: "Credit",
    description: "Balances & payments",
    href: "/credit",
  },
  reports: {
    id: "reports",
    label: "Reports",
    description: "Sales and trends",
    href: "/reports",
  },
  insights: {
    id: "insights",
    label: "Operations Insights",
    description: "Key analytics",
    href: "/insights",
  },
  help: {
    id: "help",
    label: "Help",
    description: "Support center",
    href: "/help",
  },
  settings: {
    id: "settings",
    label: "Settings",
    description: "Business controls",
    href: "/settings",
  },
};

const presetHelpText: Record<DashboardViewPreset, string> = {
  operations: "Pinned tools for everyday management and oversight.",
  checkout: "Pinned actions for front-counter speed and customer handling.",
  inventory: "Pinned tools for stock, reports, and replenishment workflows.",
};

export function PinnedPanel({
  preset,
  pinnedItemIds,
  saving,
  onChange,
}: PinnedPanelProps) {
  const selected = pinnedItemIds
    .map((id) => PIN_ITEMS[id])
    .filter(Boolean)
    .slice(0, 6);
  const available = ALL_PINNED_ITEM_IDS.filter((id) => !pinnedItemIds.includes(id));
  const [editing, setEditing] = React.useState(false);

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selected.length) return;
    const next = [...pinnedItemIds];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    void onChange(next);
  }

  function removeItem(id: PinnedPanelItemId) {
    void onChange(pinnedItemIds.filter((item) => item !== id));
  }

  function addItem(id: PinnedPanelItemId) {
    if (pinnedItemIds.includes(id) || pinnedItemIds.length >= 6) return;
    void onChange([...pinnedItemIds, id]);
  }

  return (
    <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] p-5 shadow-[0_8px_30px_rgba(59,130,246,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            Pinned Panel
          </div>
          <p className="mt-1 text-xs text-white/70">{presetHelpText[preset]}</p>
        </div>
        <div className="flex items-center gap-2">
          {saving ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
              Saving
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/10 bg-black/20 text-white hover:bg-white/10"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            {editing ? "Done" : "Customize"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {selected.map((item, index) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/25 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href={item.href}
                className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="truncate text-sm font-semibold text-white">
                  {item.label}
                </div>
                <div className="truncate text-xs text-white/70">
                  {item.description}
                </div>
              </Link>

              {editing ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${item.label} up`}
                    className={cn(
                      "h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white",
                      index === 0 && "pointer-events-none opacity-30",
                    )}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${item.label} down`}
                    className={cn(
                      "h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white",
                      index === selected.length - 1 && "pointer-events-none opacity-30",
                    )}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.label}`}
                    className="h-8 w-8 text-white/80 hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
            Add Items ({selected.length}/6)
          </div>
          <div className="flex flex-wrap gap-2">
            {available.length === 0 ? (
              <span className="text-xs text-white/70">
                You have reached the maximum pinned items.
              </span>
            ) : (
              available.map((id) => (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-black/20 text-white hover:bg-white/10"
                  onClick={() => addItem(id)}
                  disabled={selected.length >= 6}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {PIN_ITEMS[id].label}
                </Button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
