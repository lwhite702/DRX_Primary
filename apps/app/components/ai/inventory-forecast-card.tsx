"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { type InventoryForecastResult } from "@/lib/utils/inventory-engine";
import { createAppClient } from "@/lib/data/client/supabase-client";

interface InventoryForecastCardProps {
  forecast: InventoryForecastResult | null;
  currentStock: number;
  reorderLevel: number;
  productName: string;
  sku: string;
  inventoryId: string;
  businessId: string;
  forecastId?: string;
  onRestock?: (quantity: number) => void;
}

export function InventoryForecastCard({
  forecast,
  currentStock,
  reorderLevel,
  productName,
  sku,
  inventoryId,
  businessId,
  forecastId,
  onRestock,
}: InventoryForecastCardProps) {
  const [acknowledging, setAcknowledging] = useState(false);
  const supabase = createAppClient();

  if (!forecast) {
    return null;
  }

  const urgencyColors = {
    low: "border-blue-200 bg-blue-50",
    medium: "border-yellow-200 bg-yellow-50",
    high: "border-orange-200 bg-orange-50",
    critical: "border-red-200 bg-red-50",
  };

  const urgencyBadgeColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  const handleAcknowledgeAlert = async () => {
    if (!supabase) {
      toast.error("Unable to acknowledge");
      return;
    }

    setAcknowledging(true);
    try {
      // In a real scenario, we'd acknowledge specific alerts
      // For now, just log the acknowledgment
      toast.success("Alert acknowledged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to acknowledge");
    } finally {
      setAcknowledging(false);
    }
  };

  const getVelocityIcon = () => {
    switch (forecast.velocityTrend) {
      case "accelerating":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stagnant":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card className={urgencyColors[forecast.restockUrgency]}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Inventory Forecast</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {productName} • {sku}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getVelocityIcon()}
            <span className={`text-xs font-semibold px-2 py-1 rounded ${urgencyBadgeColors[forecast.restockUrgency]}`}>
              {forecast.restockUrgency.toUpperCase()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stock Status */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-lg font-semibold">{currentStock} units</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reorder Level</p>
            <p className="text-lg font-semibold">{reorderLevel} units</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recommended</p>
            <p className="text-lg font-semibold text-blue-600">
              {forecast.recommendedRestockQuantity} units
            </p>
          </div>
        </div>

        {/* Stockout Projection */}
        {forecast.daysUntilStockout !== null && (
          <div className="bg-white p-2 rounded">
            <p className="text-xs text-muted-foreground mb-1">Projected Stockout</p>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-semibold">
                {forecast.daysUntilStockout === Infinity
                  ? "No immediate risk"
                  : `${forecast.daysUntilStockout} days`}
              </p>
              {forecast.projectedStockoutDate && (
                <p className="text-xs text-muted-foreground">
                  on {new Date(forecast.projectedStockoutDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Velocity Info */}
        <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded text-xs">
          <div>
            <p className="text-muted-foreground">7d Velocity</p>
            <p className="font-semibold">{forecast.factors.velocity_7d?.toFixed(1) || "0"} units/day</p>
          </div>
          <div>
            <p className="text-muted-foreground">30d Velocity</p>
            <p className="font-semibold">{forecast.factors.velocity_30d?.toFixed(1) || "0"} units/day</p>
          </div>
          <div>
            <p className="text-muted-foreground">Trend</p>
            <p className="font-semibold capitalize">{forecast.velocityTrend}</p>
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-white p-2 rounded">
          <p className="text-xs text-muted-foreground mb-1">Forecast Reasoning</p>
          <p className="text-xs leading-relaxed">{forecast.reasoning}</p>
        </div>

        {/* Risk & Confidence */}
        <div className="flex items-center justify-between text-xs border-t pt-2">
          <div className="flex gap-4">
            <div>
              <p className="text-muted-foreground">Risk Level</p>
              <p className="font-semibold capitalize">{forecast.inventoryRiskLevel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Confidence</p>
              <p className="font-semibold">{forecast.confidenceScore.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleAcknowledgeAlert}
            disabled={acknowledging}
            variant="default"
            size="sm"
            className="flex-1"
          >
            {acknowledging ? "Acknowledging..." : "Acknowledge"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
