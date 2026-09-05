"use client";

import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  dashboardPresetLabels,
  type DashboardViewPreset,
} from "@/lib/auth/dashboard-preferences";
import { useDashboardPreferences } from "@/lib/hooks/use-dashboard-preferences";

export function DashboardViewSwitcher() {
  const { preferences, setPreset, saving, error } = useDashboardPreferences();

  const currentLabel =
    dashboardPresetLabels[preferences.preset] ?? "Operations";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Choose Home view"
          className="hidden w-[180px] justify-between md:flex"
        >
          <span className="flex min-w-0 items-center gap-2">
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentLabel}</span>
          </span>
          {saving ? (
            <span className="text-[10px] text-muted-foreground">Saving</span>
          ) : error ? (
            <span className="text-[10px] text-warning">Local only</span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[220px]">
        <DropdownMenuLabel>Home view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={preferences.preset}
          onValueChange={(value) => setPreset(value as DashboardViewPreset)}
        >
          {Object.entries(dashboardPresetLabels).map(([value, label]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
