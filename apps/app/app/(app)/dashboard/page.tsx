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
import { Shortcuts } from "./_components/Shortcuts";
import { TopMovers } from "./_components/TopMovers";
import { PinnedPanel } from "./_components/PinnedPanel";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageOpen } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const { business, loading: businessLoading } = useBusiness();
  const { preferences, saving, setPinnedItemIds } = useDashboardPreferences();
  const {
    stats,
    loading: statsLoading,
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

  if (error || !stats) {
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

  const pinnedPanel = (
    <PinnedPanel
      preset={preset}
      pinnedItemIds={preferences.pinnedItemIds}
      saving={saving}
      onChange={setPinnedItemIds}
    />
  );

  const snapshot = (
    <OperatorSnapshot
      stats={stats}
      compact={preset === "checkout"}
      emphasizeInventory={preset === "inventory"}
    />
  );

  const alerts = showAlerts ? <DashboardAlerts stats={stats} /> : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-[#4ADE80] selection:text-black">
      <div className="max-w-[1600px] mx-auto space-y-12">
        <SetupGuide />

        <PageHeader
          title="Operator Dashboard"
          description="A functional operator workspace with configurable views and pinned tools."
        />

        {preset === "checkout" ? (
          <div className="space-y-8">
            <QuickActions preset={preset} />
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
              <div className="space-y-8 xl:col-span-2">
                {snapshot}
                {alerts}
                <Shortcuts compact />
                <TopMovers movers={stats.topMovers} totalRevenue={stats.salesToday} compact />
              </div>
              <div className="space-y-8">
                {pinnedPanel}
                <ActivityTimeline activities={stats.recentActivity} compact />
              </div>
            </div>
          </div>
        ) : preset === "inventory" ? (
          <div className="space-y-8">
            {snapshot}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
              <div className="space-y-8 xl:col-span-2">
                {alerts}
                <TopMovers movers={stats.topMovers} totalRevenue={stats.salesToday} />
                <ActivityTimeline activities={stats.recentActivity} />
                <QuickActions preset={preset} compact />
              </div>
              <div className="space-y-8">
                {pinnedPanel}
                <Shortcuts compact />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {snapshot}
            {alerts}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
              <div className="space-y-8 xl:col-span-2">
                <QuickActions preset={preset} />
                <ActivityTimeline activities={stats.recentActivity} />
                <Shortcuts compact />
              </div>
              <div className="space-y-8">
                {pinnedPanel}
                <TopMovers movers={stats.topMovers} totalRevenue={stats.salesToday} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
