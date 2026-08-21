"use client";

import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataSyncStatusValue = "live" | "snapshot" | "reconnecting" | "offline";

const labels: Record<DataSyncStatusValue, string> = {
  live: "Live updates on",
  snapshot: "Refresh for latest data",
  reconnecting: "Refreshing data",
  offline: "Updates unavailable",
};

export function DataSyncStatus({
  status,
  onRefresh,
  className,
}: {
  status: DataSyncStatusValue;
  onRefresh?: () => void;
  className?: string;
}) {
  const Icon = status === "live" ? Wifi : status === "offline" ? CloudOff : RefreshCw;
  const canRefresh = Boolean(onRefresh) && status !== "reconnecting";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "reconnecting" && "animate-spin")}
        aria-hidden="true"
      />
      <span>{labels[status]}</span>
      {canRefresh ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-mr-2 h-7 rounded-full px-2 text-xs"
          onClick={onRefresh}
        >
          Refresh
        </Button>
      ) : null}
    </div>
  );
}
