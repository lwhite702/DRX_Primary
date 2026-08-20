"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AIIntelligenceDashboard } from "@/components/ai/ai-intelligence-dashboard";
import { PricingRecommendationCard } from "@/components/ai/pricing-recommendation-card";
import { InventoryForecastCard } from "@/components/ai/inventory-forecast-card";
import { useBusiness } from "@/lib/hooks/use-business";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { createAppClient } from "@/lib/data/client/supabase-client";
import { RefreshCw, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { AIPricingRecommendation, InventoryForecast } from "@/lib/validations/schemas";
import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";

interface AIRecommendations {
  pricing: AIPricingRecommendation | null;
  forecast: InventoryForecast | null;
}

export default function AIIntelligencePage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Map<string, AIRecommendations>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createAppClient();

  const filteredInventory = inventory.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAnalyzeProduct = async (inventoryItem: any) => {
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/product-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          inventory_id: inventoryItem.id,
          product_name: inventoryItem.product_name,
          sku: inventoryItem.sku,
          cost: Number(inventoryItem.unit_cost || 0),
          current_price: Number(inventoryItem.selling_price || 0),
          current_stock: inventoryItem.quantity_on_hand,
          reorder_level: inventoryItem.reorder_level,
          margin_requirement: 0.3,
          supplier_lead_time_days: 7,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();
      toast.success(`Analysis complete for ${inventoryItem.product_name}`);
      setSelectedSku(inventoryItem.sku);

      // Store recommendations
      const newRecs = new Map(recommendations);
      newRecs.set(inventoryItem.id, {
        pricing: result.data.pricing,
        forecast: result.data.forecast,
      });
      setRecommendations(newRecs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          analysis_type: "all",
        }),
      });

      if (!response.ok) {
        throw new Error("Batch analysis failed");
      }

      const result = await response.json();
      toast.success(
        `Batch analysis complete: ${result.summary.processed_count} items processed`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Batch analysis failed");
    } finally {
      setLoading(false);
    }
  };

  if (businessLoading) {
    return <AppPageSkeleton rows={5} />;
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-muted-foreground">
          No business found. Please set up your business first.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Intelligence Center</h1>
          <p className="text-muted-foreground mt-2">
            Pricing recommendations, inventory forecasting, and demand analytics
          </p>
        </div>
        <Button
          onClick={handleAnalyzeAll}
          disabled={loading}
          size="lg"
          className="w-full md:w-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {loading ? "Analyzing..." : "Analyze All Products"}
        </Button>
      </div>

      {/* Dashboard */}
      <AIIntelligenceDashboard businessId={business.id} />

      {/* Search and Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Product Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by SKU or product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredInventory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No products found
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredInventory.map((item) => {
                  const cost = Number(item.unit_cost || 0);
                  const price = Number(item.selling_price || 0);
                  const margin = cost > 0 ? (((price - cost) / cost) * 100).toFixed(0) : "0";
                  const lowStock = item.quantity_on_hand <= item.reorder_level;

                  return (
                    <Card key={item.id} className="border-border/80">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium break-words">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-mono">{item.sku}</span>
                            </p>
                          </div>
                          <Button
                            onClick={() => handleAnalyzeProduct(item)}
                            disabled={loading}
                            size="sm"
                            variant="outline"
                          >
                            Analyze
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Stock</p>
                            <p className={lowStock ? "font-bold text-destructive" : "font-medium"}>
                              {item.quantity_on_hand}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Margin</p>
                            <p className="font-medium">{margin}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cost</p>
                            <p className="font-medium">${cost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="font-medium">${price.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => {
                      const cost = Number(item.unit_cost || 0);
                      const price = Number(item.selling_price || 0);
                      const margin = cost > 0 ? ((price - cost) / cost * 100).toFixed(0) : "0";

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono font-bold">
                            {item.sku}
                          </TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>
                            <span
                              className={
                                item.quantity_on_hand <= item.reorder_level
                                  ? "text-destructive font-bold"
                                  : ""
                              }
                            >
                              {item.quantity_on_hand}
                            </span>
                          </TableCell>
                          <TableCell>${cost.toFixed(2)}</TableCell>
                          <TableCell>${price.toFixed(2)}</TableCell>
                          <TableCell>{margin}%</TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleAnalyzeProduct(item)}
                              disabled={loading}
                              size="sm"
                              variant="outline"
                            >
                              Analyze
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recommendations Display */}
      {recommendations.size > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">AI Recommendations</h2>
          {Array.from(recommendations.entries()).map(([inventoryId, recs]) => {
            const item = inventory.find((i) => i.id === inventoryId);
            if (!item) return null;

            return (
              <div key={inventoryId} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {recs.pricing && (
                  <PricingRecommendationCard
                    recommendation={{
                      recommendedPrice: recs.pricing.recommended_price,
                      recommendedRangeMin: recs.pricing.recommended_range_min,
                      recommendedRangeMax: recs.pricing.recommended_range_max,
                      confidenceScore: recs.pricing.confidence_score ?? 0,
                      reasoning: recs.pricing.reasoning,
                      factors: recs.pricing.factors || {},
                    }}
                    currentPrice={Number(item.selling_price || 0)}
                    productName={item.product_name}
                    sku={item.sku}
                    inventoryId={item.id}
                    businessId={business.id}
                  />
                )}
                {recs.forecast && (
                  <InventoryForecastCard
                    forecast={{
                      projectedStockoutDate:
                        recs.forecast.projected_stockout_date || null,
                      daysUntilStockout:
                        recs.forecast.days_until_stockout ?? null,
                      recommendedRestockQuantity:
                        recs.forecast.recommended_restock_quantity ?? 0,
                      restockUrgency: recs.forecast.restock_urgency || "low",
                      inventoryRiskLevel:
                        recs.forecast.inventory_risk_level || "low",
                      reasoning:
                        recs.forecast.reasoning || "No forecast reasoning provided.",
                      confidenceScore: recs.forecast.confidence_score ?? 0,
                      factors: recs.forecast.forecast_factors || {},
                      velocityTrend: recs.forecast.velocity_trend || "stable",
                    }}
                    currentStock={item.quantity_on_hand}
                    reorderLevel={item.reorder_level}
                    productName={item.product_name}
                    sku={item.sku}
                    inventoryId={item.id}
                    businessId={business.id}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {recommendations.size === 0 && filteredInventory.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Select a product and click "Analyze" to generate AI-powered pricing and inventory
              recommendations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
