"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Zap, TrendingUp, Lock } from "lucide-react";
import { toast } from "sonner";

interface CreditRecommendation {
  recommended_limit: number;
  risk_score: number;
  justification: string;
  range_min: number;
  range_max: number;
}

interface AICreditPanelProps {
  customer_id: string;
  current_limit: number;
  ai_recommended_limit?: number;
  risk_score?: number;
  last_reviewed_at?: string;
  can_apply: boolean;
}

export function AICreditPanel({
  customer_id,
  current_limit,
  ai_recommended_limit = 0,
  risk_score = 0,
  last_reviewed_at,
  can_apply,
}: AICreditPanelProps) {
  const [recommendation, setRecommendation] =
    useState<CreditRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideLimit, setOverrideLimit] = useState(current_limit);
  const [overrideReason, setOverrideReason] = useState("");
  const [displayedLimit, setDisplayedLimit] = useState(current_limit);

  useEffect(() => {
    setDisplayedLimit(current_limit);
  }, [current_limit]);

  useEffect(() => {
    // Load stored recommendation if available
    if (ai_recommended_limit > 0) {
      setRecommendation({
        recommended_limit: ai_recommended_limit,
        risk_score: risk_score || 0,
        justification: `Last reviewed: ${last_reviewed_at ? new Date(last_reviewed_at).toLocaleDateString() : "Never"}`,
        range_min: ai_recommended_limit * 0.8,
        range_max: ai_recommended_limit * 1.2,
      });
    }
  }, [ai_recommended_limit, risk_score, last_reviewed_at]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/credit/refresh-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to refresh recommendation");
      }

      const data = await response.json();
      if (data.recommendation) {
        setRecommendation(data.recommendation);
        toast.success("AI recommendation updated");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRecommendation = async () => {
    setApplying(true);
    try {
      const response = await fetch("/api/credit/apply-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id,
          action: "apply_ai_recommendation",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply recommendation");
      }

      const data = await response.json();
      setDisplayedLimit(
        Number(data.new_limit ?? recommendation?.recommended_limit ?? displayedLimit),
      );
      toast.success("Credit limit updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply recommendation"
      );
    } finally {
      setApplying(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      toast.error("Please provide a reason for override");
      return;
    }

    setApplying(true);
    try {
      const response = await fetch("/api/credit/apply-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id,
          action: "override",
          new_limit: overrideLimit,
          reason: overrideReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to override limit");
      }

      const data = await response.json();
      setDisplayedLimit(Number(data.new_limit ?? overrideLimit));
      toast.success("Credit limit overridden successfully");
      setShowOverrideDialog(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to override limit"
      );
    } finally {
      setApplying(false);
    }
  };

  const getRiskColor = (score: number): string => {
    if (score >= 75) return "text-red-600";
    if (score >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskLabel = (score: number): string => {
    if (score >= 75) return "High Risk";
    if (score >= 50) return "Medium Risk";
    return "Low Risk";
  };

  return (
    <div className="space-y-4">
      {/* Current Limit Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Current Credit Limit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">${displayedLimit.toFixed(2)}</div>
          <p className="text-sm text-muted-foreground mt-1">Approved maximum credit exposure</p>
        </CardContent>
      </Card>

      {/* AI Recommendation Card */}
      {recommendation ? (
        <Card className="border-blue-500/20 bg-[#161616]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <Zap className="h-4 w-4 text-blue-400" />
              AI Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Recommended Limit</Label>
                <div className="text-2xl font-bold font-mono text-blue-400">
                  ${recommendation.recommended_limit.toFixed(2)}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Risk Score</Label>
                <div className={`text-2xl font-bold font-mono ${getRiskColor(recommendation.risk_score)}`}>
                  {recommendation.risk_score.toFixed(0)}/100
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getRiskLabel(recommendation.risk_score)}
                </p>
              </div>
            </div>

            <div className="bg-[#1C1C1C] p-3 rounded-lg border border-white/10">
              <p className="text-sm text-white/90 leading-relaxed">{recommendation.justification}</p>
            </div>

            <div className="bg-[#1C1C1C] p-3 rounded-lg border border-white/10">
              <Label className="text-xs text-muted-foreground">Suggested Range</Label>
              <p className="text-sm font-mono font-medium text-white mt-1">
                ${recommendation.range_min.toFixed(2)} - ${recommendation.range_max.toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? "Refreshing..." : "Refresh Recommendation"}
              </Button>
              {can_apply && (
                <>
                  <Button
                    onClick={handleApplyRecommendation}
                    disabled={applying || loading}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {applying ? "Applying..." : "Apply Recommendation"}
                  </Button>
                  <Button
                    onClick={() => setShowOverrideDialog(true)}
                    variant="outline"
                    size="sm"
                  >
                    Override
                  </Button>
                </>
              )}
            </div>

            {recommendation.recommended_limit > displayedLimit && (
              <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded">
                <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">
                  <strong>Opportunity:</strong> Customer qualifies for increase of $
                  {(recommendation.recommended_limit - displayedLimit).toFixed(2)}
                </p>
              </div>
            )}

            {recommendation.recommended_limit < displayedLimit && (
              <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Caution:</strong> Recent activity suggests reducing limit by $
                  {(displayedLimit - recommendation.recommended_limit).toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No AI recommendation available yet
            </p>
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="w-full mt-4"
            >
              {loading ? "Generating..." : "Generate AI Recommendation"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Credit Limit</DialogTitle>
            <DialogDescription>
              Set a custom credit limit and provide a reason for the override.
              This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="override_limit">New Credit Limit</Label>
              <Input
                id="override_limit"
                type="number"
                value={overrideLimit}
                onChange={(e) => setOverrideLimit(Number(e.target.value))}
                min="0"
                step="100"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="override_reason">Reason for Override *</Label>
              <textarea
                id="override_reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why you're overriding the AI recommendation..."
                className="w-full mt-1 p-2 border rounded text-sm"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowOverrideDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleOverride}
                disabled={applying || !overrideReason.trim()}
              >
                {applying ? "Saving..." : "Confirm Override"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
