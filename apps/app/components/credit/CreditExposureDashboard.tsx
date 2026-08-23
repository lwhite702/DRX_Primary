"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ExposureMetrics {
  total_credit_limits: number;
  total_credit_balance: number;
  utilization_ratio: number;
  at_risk_customers: number;
  customers_reviewed_today: number;
}

interface CreditExposureDashboardProps {
  business_id: string;
  auto_refresh?: boolean;
  refresh_interval?: number;
}

export function CreditExposureDashboard({
  business_id,
  auto_refresh = true,
  refresh_interval = 300000, // 5 minutes
}: CreditExposureDashboardProps) {
  const [metrics, setMetrics] = useState<ExposureMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/credit/exposure-report?business_id=${business_id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch exposure metrics");
      }

      const data = await response.json();
      const payload = data?.data?.data || data?.data || data;
      setMetrics({
        total_credit_limits: Number(payload?.total_credit_limits ?? 0),
        total_credit_balance: Number(payload?.total_credit_balance ?? 0),
        utilization_ratio: Number(payload?.utilization_ratio ?? 0),
        at_risk_customers: Number(payload?.at_risk_customers ?? 0),
        customers_reviewed_today: Number(payload?.customers_reviewed_today ?? 0),
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching credit exposure metrics:", error);
      toast.error("Failed to load credit exposure metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [business_id]);

  useEffect(() => {
    if (!auto_refresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, refresh_interval);

    return () => clearInterval(interval);
  }, [business_id, auto_refresh, refresh_interval]);

  if (loading) {
    return (
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 md:grid-cols-4" aria-label="Loading credit exposure" aria-busy="true">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Unable to load credit exposure metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  const utilizationPercent = Math.round((metrics?.utilization_ratio ?? 0) * 100);
  const utilizationColor =
    utilizationPercent > 80
      ? "text-red-600"
      : utilizationPercent > 60
      ? "text-yellow-600"
      : "text-green-600";

  const riskLevel =
    (metrics?.at_risk_customers ?? 0) > 0
      ? (metrics?.at_risk_customers ?? 0) > 5
        ? "critical"
        : "high"
      : "low";

  const riskIcon =
    riskLevel === "critical"
      ? AlertTriangle
      : riskLevel === "high"
      ? AlertCircle
      : CheckCircle;

  const RiskIcon = riskIcon;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Credit Exposure Summary</span>
            {lastUpdated && (
              <span className="text-xs font-normal text-muted-foreground">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Credit Limits */}
            <div className="bg-slate-50 p-4 rounded">
              <p className="text-xs text-muted-foreground">Total Credit Limits</p>
              <p className="text-2xl font-bold mt-2">
                ${(metrics?.total_credit_limits ?? 0).toFixed(2)}
              </p>
            </div>

            {/* Current Balance */}
            <div className="bg-slate-50 p-4 rounded">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold mt-2">
                ${(metrics?.total_credit_balance ?? 0).toFixed(2)}
              </p>
            </div>

            {/* Utilization Ratio */}
            <div className="bg-slate-50 p-4 rounded">
              <p className="text-xs text-muted-foreground">Utilization Ratio</p>
              <p className={`text-2xl font-bold mt-2 ${utilizationColor}`}>
                {utilizationPercent}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full ${
                    utilizationPercent > 80
                      ? "bg-red-600"
                      : utilizationPercent > 60
                      ? "bg-yellow-600"
                      : "bg-green-600"
                  }`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Risk Status */}
            <div className="bg-slate-50 p-4 rounded">
              <p className="text-xs text-muted-foreground">Risk Status</p>
              <div className="mt-2 flex items-center gap-2">
                <RiskIcon
                  className={`h-5 w-5 ${
                    riskLevel === "critical"
                      ? "text-red-600"
                      : riskLevel === "high"
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                />
                <Badge
                  variant={
                    riskLevel === "critical"
                      ? "destructive"
                      : riskLevel === "high"
                      ? "outline"
                      : "secondary"
                  }
                >
                  {riskLevel === "critical"
                    ? "Critical"
                    : riskLevel === "high"
                    ? "High"
                    : "Low"}
                </Badge>
              </div>
            </div>
          </div>

          {/* At-Risk Customers Alert */}
          {metrics.at_risk_customers > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">
                    {metrics.at_risk_customers} customer
                    {metrics.at_risk_customers !== 1 ? "s" : ""} at high risk
                  </p>
                  <p className="text-sm text-yellow-800">
                    Review credit limits and repayment history for these customers
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI Review Status */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="flex gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">
                  {metrics.customers_reviewed_today} customer
                  {metrics.customers_reviewed_today !== 1 ? "s" : ""} reviewed today
                </p>
                <p className="text-sm text-blue-800">
                  AI credit limits updated in today's scheduled refresh
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Exposure Management Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {utilizationPercent > 80 && (
              <li className="flex gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>
                  High utilization ({utilizationPercent}%). Consider reviewing and
                  adjusting credit limits or collecting payments.
                </span>
              </li>
            )}
            {metrics.at_risk_customers > 0 && (
              <li className="flex gap-2">
                <span className="text-yellow-600 font-bold">•</span>
                <span>
                  {metrics.at_risk_customers} customer(s) are at risk. Consider
                  temporary credit holds or payment plans.
                </span>
              </li>
            )}
            {utilizationPercent < 50 && metrics.at_risk_customers === 0 && (
              <li className="flex gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>
                  Healthy credit portfolio. Continue monitoring with regular AI reviews.
                </span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
