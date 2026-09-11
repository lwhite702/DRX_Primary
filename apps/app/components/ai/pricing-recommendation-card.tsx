"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { toast } from "sonner";
import { type PricingRecommendation } from "@/lib/utils/pricing-recommendation";
import { formatAmount, formatPercentage } from "@/lib/number-format";


interface PricingRecommendationCardProps {
  recommendation: PricingRecommendation | null;
  currentPrice: number;
  productName: string;
  sku: string;
  inventoryId: string;
  businessId: string;
  recommendationId?: string;
  onApplied?: (newPrice: number) => void;
}

export function PricingRecommendationCard({
  recommendation,
  currentPrice,
  productName,
  sku,
  inventoryId,
  businessId,
  recommendationId,
  onApplied,
}: PricingRecommendationCardProps) {
  const [applying, setApplying] = useState(false);


  if (!recommendation) {
    return null;
  }

  const priceDifference = recommendation.recommendedPrice - currentPrice;
  const percentChange = formatPercentage((priceDifference / currentPrice) * 100);
  const isIncrease = priceDifference > 0;

  const handleApplyRecommendation = async () => {
    if (!recommendationId) {
      toast.error("Unable to apply recommendation");
      return;
    }

    setApplying(true);
    try {
      const response = await fetch("/api/ai/apply-pricing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId, recommendation_id: recommendationId }) });
      const receipt = await response.json();
      if (!response.ok || receipt?.success !== true || !Number.isFinite(receipt.newPrice)) throw new Error(response.status === 409 ? "Price changed. Generate a new analysis." : "Price update was not confirmed. Retry this recommendation.");
      toast.success(
        `Price updated to $${formatAmount(receipt.newPrice)} for ${productName}`
      );
      onApplied?.(receipt.newPrice);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply recommendation");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className={isIncrease ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">AI Recommended Price</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {productName} • {sku}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isIncrease ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-orange-600" />
            )}
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Comparison */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-lg font-semibold">${formatAmount(currentPrice)}</p>
          </div>
          <div className="flex items-center justify-center">
            <div className={`text-sm font-bold ${isIncrease ? "text-green-600" : "text-orange-600"}`}>
              {isIncrease ? "+" : ""}{percentChange}%
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recommended</p>
            <p className="text-lg font-semibold text-green-600">
              ${formatAmount(recommendation.recommendedPrice)}
            </p>
          </div>
        </div>

        {/* Price Range */}
        <div className="bg-white p-2 rounded text-xs">
          <p className="text-muted-foreground mb-1">Price Range</p>
          <p className="font-mono">
            ${formatAmount(recommendation.recommendedRangeMin)} - $
            {formatAmount(recommendation.recommendedRangeMax)}
          </p>
        </div>

        {/* Reasoning */}
        <div className="bg-white p-2 rounded">
          <p className="text-xs text-muted-foreground mb-1">Why?</p>
          <p className="text-xs leading-relaxed">{recommendation.reasoning}</p>
        </div>

        {/* Confidence */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-semibold">{formatPercentage(recommendation.confidenceScore)}%</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApplyRecommendation}
            disabled={applying}
            className="flex-1"
            size="sm"
          >
            {applying ? "Applying..." : "Apply Price"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Review Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
