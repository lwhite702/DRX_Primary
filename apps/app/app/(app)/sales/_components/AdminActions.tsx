import { Lock, Package, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NoSaleButton } from "@/components/pos/no-sale-button";
import Link from "next/link";

interface AdminActionsProps {
  businessId: string;
  onShrinkageClick: () => void;
  onInvCheckClick: () => void;
}

export function AdminActions({
  businessId,
  onShrinkageClick,
  onInvCheckClick,
}: AdminActionsProps) {
  return (
    <div className="space-y-2 pt-4 border-t">
      <Label className="text-xs font-semibold">Admin Functions</Label>
      <div className="grid grid-cols-2 gap-2">
        <NoSaleButton businessId={businessId} />
        <Button
          onClick={onShrinkageClick}
          size="sm"
          variant="outline"
          className="gap-1"
        >
          <Lock className="h-4 w-4" />
          Shrinkage
        </Button>
        <Button
          onClick={onInvCheckClick}
          size="sm"
          variant="outline"
          className="gap-1"
        >
          <Package className="h-4 w-4" />
          Inv. Check
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1">
          <Link href="/reports">
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
        </Button>
      </div>
    </div>
  );
}
