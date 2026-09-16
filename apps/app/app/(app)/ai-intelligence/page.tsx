"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/lib/adapters/auth/ui";
import { useBusiness } from "@/lib/hooks/use-business";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { PricingRecommendation } from "@/lib/utils/pricing-recommendation";
import type { InventoryForecastResult } from "@/lib/utils/inventory-forecast";
import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";
import { DataSyncStatus } from "@/components/ui/data-sync-status";
import {
  inventoryNumber,
  inventoryText,
  processedCount,
  unwrapApiData,
} from "@/lib/ai/intelligence-normalizers";

interface AIRecommendations {
  pricing: PricingRecommendation | null;
  pricingRecommendationId?: string;
  forecast: InventoryForecastResult | null;
  forecastId?: string;
  alerts?: Array<{ id: string }>;
  scope?: string;
}

type AIInventoryItem = Record<string, unknown> & {
  id: string;
  sku?: string | null;
  product_name?: string | null;
  productName?: string | null;
};

export default function AIIntelligencePage() {
  const { business, loading: businessLoading } = useBusiness();
  const { userId } = useAuth();
  const scope = `${userId ?? ""}:${business?.id ?? ""}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const attempts = useRef(new Map<string, string>());
  const {
    inventory,
    loading: inventoryLoading,
    syncStatus,
    refresh: refreshInventory,
  } = useRealtimeInventory(business?.id || null);
  const [recommendations, setRecommendations] = useState<Map<string, AIRecommendations>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  useEffect(() => { setRecommendations(new Map()); setLoading(false); }, [scope]);
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.toLowerCase();
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const filteredInventory = safeInventory.filter(
    (item) =>
      inventoryText(item?.sku).toLowerCase().includes(normalizedSearch) ||
      inventoryText(item?.product_name ?? item?.productName)
        .toLowerCase()
        .includes(normalizedSearch)
  );

  const handleAnalyzeProduct = async (inventoryItem: AIInventoryItem) => {
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    const attemptKey = `${scope}:${inventoryItem.id}`;
    const requestId = attempts.current.get(attemptKey) ?? crypto.randomUUID();
    attempts.current.set(attemptKey, requestId);
    setLoading(true);
    try {
      const response = await fetch("/api/ai/product-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          inventory_id: inventoryItem.id,
          request_id: requestId,
          product_name: inventoryText(inventoryItem.product_name ?? inventoryItem.productName),
          sku: inventoryText(inventoryItem.sku),
          cost: inventoryNumber(inventoryItem, "unit_cost", "unitCost"),
          current_price: inventoryNumber(inventoryItem, "selling_price", "sellingPrice"),
          current_stock: inventoryNumber(inventoryItem, "quantity_on_hand", "quantityOnHand"),
          reorder_level: inventoryNumber(inventoryItem, "reorder_level", "reorderLevel"),
          margin_requirement: 0.3,
          supplier_lead_time_days: 7,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();
      const data = unwrapApiData<AIRecommendations>(result);
      if (!data || !data.pricing || !data.forecast) throw new Error("Analysis returned an invalid response");
      if (currentScope.current !== scope) return;
      attempts.current.delete(attemptKey);
      const productName = inventoryText(inventoryItem.product_name ?? inventoryItem.productName);
      toast.success(`Analysis complete for ${productName || "product"}`);

      // Store recommendations
      const newRecs = new Map(recommendations);
      newRecs.set(inventoryItem.id, {
        pricingRecommendationId: data.pricingRecommendationId,
        pricing: data.pricing ?? null,
        forecast: data.forecast ?? null,
        forecastId: data.forecastId,
        alerts: Array.isArray(data.alerts) ? data.alerts.filter(alert => typeof alert?.id === "string" && alert.id.trim()) : [],
        scope,
      });
      setRecommendations(newRecs);
    } catch (error) {
      if (currentScope.current !== scope) return;
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      if (currentScope.current === scope) setLoading(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    const attemptKey = `${scope}:batch`;
    const requestId = attempts.current.get(attemptKey) ?? crypto.randomUUID();
    attempts.current.set(attemptKey, requestId);
    setLoading(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          analysis_type: "all",
          request_id: requestId,
        }),
      });

      if (!response.ok) {
        throw new Error("Batch analysis failed");
      }

      const result = await response.json();
      if (currentScope.current !== scope) return;
      if (!Number.isSafeInteger(result?.summary?.processed_count)) throw new Error("Invalid analysis receipt");
      attempts.current.delete(attemptKey);
      toast.success(
        `Batch analysis complete: ${processedCount(result)} items processed`
      );
    } catch (error) {
      if (currentScope.current !== scope) return;
      toast.error(error instanceof Error ? error.message : "Batch analysis failed");
    } finally {
      if (currentScope.current === scope) setLoading(false);
    }
  };

  if (businessLoading || inventoryLoading) {
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
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <DataSyncStatus
            status={syncStatus}
            onRefresh={() => void refreshInventory()}
          />
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
                  const cost = inventoryNumber(item, "unit_cost", "unitCost");
                  const price = inventoryNumber(item, "selling_price", "sellingPrice");
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
                      const cost = inventoryNumber(item, "unit_cost", "unitCost");
                      const price = inventoryNumber(item, "selling_price", "sellingPrice");
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
            const item = safeInventory.find((i) => i.id === inventoryId);
            if (!item || recs.scope !== scope) return null;

            return (
              <div key={inventoryId} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {recs.pricing && (
                  <PricingRecommendationCard
                    recommendation={recs.pricing}
                    recommendationId={recs.pricingRecommendationId}
                    onApplied={() => { void refreshInventory(); }}
                    currentPrice={inventoryNumber(item, "selling_price", "sellingPrice")}
                    productName={item.product_name}
                    sku={item.sku}
                    inventoryId={item.id}
                    businessId={business.id}
                  />
                )}
                {recs.forecast && (
                  <InventoryForecastCard
                    forecast={recs.forecast}
                    forecastId={recs.forecastId}
                    alertIds={recs.alerts?.map(alert => alert.id)}
                    contextKey={scope}
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
