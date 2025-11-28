"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase/client";

interface AIIntelligenceDashboardProps {
  businessId: string;
}

export function AIIntelligenceDashboard({ businessId }: AIIntelligenceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState({
    pricingRecommendations: 0,
    criticalAlerts: 0,
    urgentRestocks: 0,
    opportunitiesCount: 0,
  });

  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchDashboardData();
  }, [businessId]);

  const fetchDashboardData = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      const [pricingRes, alertsRes, forecastsRes] = await Promise.all([
        supabase
          .from("ai_pricing_recommendations")
          .select("count", { count: "exact" })
          .eq("business_id", businessId)
          .eq("status", "pending"),
        supabase
          .from("inventory_alerts")
          .select("count", { count: "exact" })
          .eq("business_id", businessId)
          .eq("acknowledged", false)
          .in("severity", ["high", "critical"]),
        supabase
          .from("inventory_forecasts")
          .select("count", { count: "exact" })
          .eq("business_id", businessId)
          .in("restock_urgency", ["high", "critical"]),
      ]);

      setData({
        pricingRecommendations: pricingRes.count || 0,
        criticalAlerts: alertsRes.count || 0,
        urgentRestocks: forecastsRes.count || 0,
        opportunitiesCount: (pricingRes.count || 0) + (forecastsRes.count || 0),
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load AI intelligence data");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          analysis_type: "all",
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result = await response.json();
      toast.success(`Analysis complete: ${result.processed_count} items analyzed`);
      await fetchDashboardData();
    } catch (error) {
      toast.error("Failed to run analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
  }: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="opacity-50">{Icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>AI Intelligence Dashboard</CardTitle>
            <Button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {analyzing ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading intelligence data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Pricing Recommendations"
                value={data.pricingRecommendations}
                icon={<TrendingUp className="h-6 w-6 text-blue-500" />}
                color="border-blue-200 bg-blue-50"
              />
              <StatCard
                label="Critical Alerts"
                value={data.criticalAlerts}
                icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
                color="border-red-200 bg-red-50"
              />
              <StatCard
                label="Urgent Restocks"
                value={data.urgentRestocks}
                icon={<BarChart3 className="h-6 w-6 text-orange-500" />}
                color="border-orange-200 bg-orange-50"
              />
              <StatCard
                label="Total Opportunities"
                value={data.opportunitiesCount}
                icon={<TrendingUp className="h-6 w-6 text-green-500" />}
                color="border-green-200 bg-green-50"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {data.pricingRecommendations > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>
                  <strong>{data.pricingRecommendations} pricing recommendation(s)</strong> waiting
                  for review. Apply to optimize margins and competitiveness.
                </span>
              </li>
            )}
            {data.criticalAlerts > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>
                  <strong>{data.criticalAlerts} critical alert(s)</strong> require immediate
                  attention to prevent stockouts or losses.
                </span>
              </li>
            )}
            {data.urgentRestocks > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>
                  <strong>{data.urgentRestocks} item(s)</strong> need urgent restock to avoid
                  lost sales.
                </span>
              </li>
            )}
            {data.opportunitiesCount === 0 && (
              <li className="text-muted-foreground">
                No immediate AI recommendations. Inventory and pricing are optimized.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
