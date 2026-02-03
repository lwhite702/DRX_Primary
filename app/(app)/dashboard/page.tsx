"use client";

import React from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import { useDashboardData } from "./_hooks/useDashboardData";
import { SetupGuide } from "@/components/onboarding/setup-guide";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { PageHeader } from "@/components/ui/page-header";
import { OperatorSnapshot } from "./_components/OperatorSnapshot";
import { QuickActions } from "./_components/QuickActions";
import { DashboardAlerts } from "./_components/DashboardAlerts";
import { ActivityTimeline } from "./_components/ActivityTimeline";
import { Shortcuts } from "./_components/Shortcuts";
import { SystemHealth } from "./_components/SystemHealth";
import { TopMovers } from "./_components/TopMovers";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageOpen } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

export default function DashboardPage() {
  const { business, loading: businessLoading } = useBusiness();
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
        onAction={() => (window.location.href = "/onboarding")}
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

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-[#4ADE80] selection:text-black">
      <div className="max-w-[1600px] mx-auto space-y-12">
        <SetupGuide />
        <WelcomeModal />

        <PageHeader
          title="Operator Dashboard"
          description="Real-time snapshot of your operation. All numbers reflect current tenant scope and privacy preset."
        >
          <div className="flex items-center gap-2">
            <div className="bg-[#4ADE80]/10 border border-[#4ADE80]/20 text-[#4ADE80] text-[10px] font-bold px-2 py-1 rounded">
              ONLINE
            </div>
            <div className="bg-white/5 border border-white/10 text-muted-foreground text-[10px] font-bold px-2 py-1 rounded">
              v2.4.0
            </div>
          </div>
        </PageHeader>

        <OperatorSnapshot stats={stats} />

        <QuickActions />

        <DashboardAlerts stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <ActivityTimeline activities={stats.recentActivity} />
            <Shortcuts />
            <SystemHealth health={stats.systemHealth} />
          </div>

          <div className="lg:col-span-1 border-l border-white/5 pl-0 lg:pl-12 pt-12 lg:pt-0 border-t lg:border-t-0">
            <div className="sticky top-8 space-y-12">
              <TopMovers
                movers={stats.topMovers}
                totalRevenue={stats.salesToday}
              />

              {/* Team Activity (Mocked directly here as it's simple) */}
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  TEAM ACTIVITY
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                        {/* Avatar placeholder */}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Sarah Chen
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Manager • 12 sales today
                        </div>
                      </div>
                    </div>
                    <div className="text-[8px] font-bold bg-[#4ADE80]/10 text-[#4ADE80] px-1.5 py-0.5 rounded border border-[#4ADE80]/20">
                      ACTIVE
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden"></div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Marcus Johnson
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Staff • 8 sales today
                        </div>
                      </div>
                    </div>
                    <div className="text-[8px] font-bold bg-[#4ADE80]/10 text-[#4ADE80] px-1.5 py-0.5 rounded border border-[#4ADE80]/20">
                      ACTIVE
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden"></div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          David Park
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Staff • Last active 2h ago
                        </div>
                      </div>
                    </div>
                    <div className="text-[8px] font-bold bg-gray-500/10 text-gray-500 px-1.5 py-0.5 rounded border border-gray-500/20">
                      OFFLINE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
