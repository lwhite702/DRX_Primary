"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/adapters/auth/ui";
import { formatCount } from "@/lib/number-format";
import { Skeleton } from "@/components/ui/skeleton";
import { processedCount } from "@/lib/ai/intelligence-normalizers";

interface AIIntelligenceDashboardProps {
  businessId: string;
}

export function AIIntelligenceDashboard({ businessId }: AIIntelligenceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState({
    pricingRecommendations: 0,
    criticalAlerts: 0,
    urgentRestocks: 0,
    opportunitiesCount: 0,
  });

  const { userId } = useAuth();
  const scope = `${userId ?? ""}:${businessId}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const attempts = useRef(new Map<string, string>());
  const loadVersion = useRef(0);

  useEffect(() => {
    setAnalyzing(false);
    fetchDashboardData();
  }, [businessId, userId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const version = ++loadVersion.current;
      const response = await fetch(`/api/ai/product-intelligence?business_id=${encodeURIComponent(businessId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Intelligence unavailable");
      const result = await response.json(), counts = result?.data?.counts;
      if (!counts || !["pricingRecommendations", "criticalAlerts", "urgentRestocks", "opportunitiesCount"].every(key => Number.isSafeInteger(counts[key]) && counts[key] >= 0)) throw new Error("Invalid intelligence totals");
      if (currentScope.current !== scope || version !== loadVersion.current) return;
      setData(counts);
    } catch (caught) {
      if (currentScope.current !== scope) return;
      toast.error("Failed to load AI intelligence data");
      setError("Intelligence data could not be loaded.");
    } finally {
      if (currentScope.current === scope) setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!userId) return;
    const requestId = attempts.current.get(scope) ?? crypto.randomUUID();
    attempts.current.set(scope, requestId);
    setAnalyzing(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          analysis_type: "all",
          request_id: requestId,
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result = await response.json();
      if (currentScope.current !== scope) return;
      if (!Number.isSafeInteger(result?.summary?.processed_count)) throw new Error("Invalid analysis receipt");
      attempts.current.delete(scope);
      toast.success(`Analysis complete: ${processedCount(result)} items analyzed`);
      await fetchDashboardData();
    } catch {
      if (currentScope.current === scope) toast.error("Analysis was not confirmed. Run again to retry the same request.");
    } finally {
      if (currentScope.current === scope) setAnalyzing(false);
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
          <p className="text-2xl font-bold mt-1">{formatCount(value)}</p>
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
            <div className="grid grid-cols-2 gap-4 py-2 md:grid-cols-4" aria-label="Loading intelligence summary" aria-busy="true">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning/5 p-4 text-sm">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void fetchDashboardData()}>
                Try again
              </Button>
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
