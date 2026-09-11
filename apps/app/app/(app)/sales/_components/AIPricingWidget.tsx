import { formatPercentage } from "@/lib/number-format";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type AIPricingRecommendation } from "@/lib/utils/pos-engine";

interface AIPricingWidgetProps {
  recommendations: AIPricingRecommendation[];
  onApply: (rec: AIPricingRecommendation) => void;
}

export function AIPricingWidget({
  recommendations,
  onApply,
}: AIPricingWidgetProps) {
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          AI Price Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-3 border rounded-lg hover:bg-muted/50 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">{rec.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Confidence: {formatPercentage(rec.confidence_score)}%
                  </p>
                </div>
                <span
                  className={`text-sm font-bold px-2 py-1 rounded ${
                    (rec.price_change_percentage ?? 0) > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {(rec.price_change_percentage ?? 0) > 0 ? "+" : ""}
                  {rec.price_change_percentage === null ? "No prior price" : `${formatPercentage(rec.price_change_percentage)}%`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Current</p>
                  <p className="font-medium">${rec.current_price.toFixed(2)}</p>
                </div>
                <div className="text-muted-foreground">→</div>
                <div>
                  <p className="text-muted-foreground">Recommended</p>
                  <p className="font-medium">
                    ${rec.recommended_price.toFixed(2)}
                  </p>
                </div>
              </div>
              {rec.recommendation_reason && (
                <p className="text-xs text-muted-foreground italic">
                  {rec.recommendation_reason}
                </p>
              )}
              <Button
                onClick={() => onApply(rec)}
                size="sm"
                className="w-full"
                variant="outline"
              >
                Apply Recommendation
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
