"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

interface NoSaleButtonProps {
  businessId: string;
  onSuccess?: () => void;
}

export function NoSaleButton({ businessId, onSuccess }: NoSaleButtonProps) {
  const [processing, setProcessing] = useState(false);

  const handleNoSale = async () => {
    setProcessing(true);

    try {
      const result = await posWeightEngine.recordDrawerEvent(
        businessId,
        "no_sale",
        "Drawer opened - no sale recorded"
      );

      if (result.success) {
        toast.success("No sale event recorded");
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to record no sale event");
      }
    } catch (error) {
      console.error("Error recording no sale:", error);
      toast.error("Failed to record no sale event");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleNoSale}
      disabled={processing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <DollarSign className="h-4 w-4" />
      {processing ? "Recording..." : "Open Drawer / No Sale"}
    </Button>
  );
}
