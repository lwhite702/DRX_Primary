import { MovingToday } from "@/components/dashboard/operator/moving-today";
import { OperatorSnapshot } from "@/components/dashboard/operator/snapshot";
import { QuickActions } from "@/components/dashboard/operator/quick-actions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Today | Deelrx CRM",
  description: "Operational overview for daily tasks and monitoring.",
};

export default function OperatorDashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <section className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Today
          </h1>
          <p className="text-muted-foreground">
            Sales, stock exceptions, and the next actions that need attention.
          </p>
        </section>

        {/* Primary Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Feed: Moving Today (Takes up 2/3 on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            <MovingToday className="h-full" />
          </div>

          {/* Quick Actions (Takes up 1/3, sidebar equivalent) */}
          <div className="lg:col-span-1 space-y-6">
            <QuickActions />
          </div>
        </div>

        {/* Metric Snapshot (Full width below) */}
        <section>
          <OperatorSnapshot />
        </section>
      </main>
    </div>
  );
}
