"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/lib/hooks/use-business";
import { useDashboardPreferences } from "@/lib/hooks/use-dashboard-preferences";
import { useDashboardData } from "./_hooks/useDashboardData";
import { SetupGuide } from "@/components/onboarding/setup-guide";
import { PageHeader } from "@/components/ui/page-header";
import { OperatorSnapshot } from "./_components/OperatorSnapshot";
import { QuickActions } from "./_components/QuickActions";
import { DashboardAlerts } from "./_components/DashboardAlerts";
import { ActivityTimeline } from "./_components/ActivityTimeline";
import { TopMovers } from "./_components/TopMovers";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageOpen, RefreshCw } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const { business, loading: businessLoading } = useBusiness();
  const { preferences } = useDashboardPreferences();
  const {
    stats,
    loading: statsLoading,
    refreshing,
    error,
    refresh,
  } = useDashboardData(business?.id);

  const loading = businessLoading || statsLoading;

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!business) {
    return (
        <EmptyState
        icon={PackageOpen}
        title="No Business Found"
        description="You haven't set up a business yet. Create one to get started."
        actionLabel="Create Business"
          onAction={() => router.push("/onboarding")}
          className="m-8"
        />
      );
  }

  if (!stats) {
    return (
      <div className="p-4 md:p-8">
        <ErrorState
          message={error || "Failed to load dashboard data"}
          onRetry={refresh}
        />
      </div>
    );
  }

  const preset = preferences.preset;
  const showAlerts = stats.lowStockCount > 0 || stats.overdueCount > 0;
  const hasActivity = stats.recentActivity.length > 0;
  const hasMovers = stats.topMovers.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 font-sans text-foreground selection:bg-accent selection:text-black md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <SetupGuide />

        <PageHeader
          title="Operator Dashboard"
          description="Today’s business health, the exceptions that need attention, and your next action."
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label={refreshing ? "Refreshing dashboard data" : "Refresh dashboard data"}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </PageHeader>

        {error ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-white/80"
          >
            <span>Could not refresh the dashboard. Showing the last loaded values.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        ) : null}

        <OperatorSnapshot
          stats={stats}
          emphasizeInventory={preset === "inventory"}
        />

        {showAlerts ? <DashboardAlerts stats={stats} /> : null}

        <QuickActions preset={preset} />

        {hasActivity || hasMovers ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {hasActivity ? (
              <ActivityTimeline activities={stats.recentActivity} compact />
            ) : null}
            {hasMovers ? (
              <TopMovers
                movers={stats.topMovers}
                totalRevenue={stats.salesToday}
                compact
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
