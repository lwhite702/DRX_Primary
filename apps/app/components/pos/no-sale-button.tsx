"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { recordDrawerEvent } from "@/lib/pos/drawer-client";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

interface NoSaleButtonProps {
  businessId: string;
  onSuccess?: () => void;
}

export function NoSaleButton({ businessId, onSuccess }: NoSaleButtonProps) {
  const [processing, setProcessing] = useState(false);
  const pending = useRef(new Map<string, string>());
  const busy = useRef(false);
  const currentBusiness = useRef(businessId); currentBusiness.current = businessId;

  const handleNoSale = async () => {
    if (busy.current || !businessId) return;
    busy.current = true; setProcessing(true);
    const targetBusiness = businessId;
    const requestId = pending.current.get(targetBusiness) ?? crypto.randomUUID();
    pending.current.set(targetBusiness, requestId);

    try {
      const result = await recordDrawerEvent(
        targetBusiness,
        "no_sale",
        "Drawer opened - no sale recorded",
        requestId
      );

      if (result.success) {
        pending.current.delete(targetBusiness);
        if (currentBusiness.current !== targetBusiness) return;
        toast.success("No sale event recorded");
        onSuccess?.();
      }
    } catch (error) {
      if (currentBusiness.current === targetBusiness) toast.error("No sale event could not be confirmed. Retry to finish the same event.");
    } finally {
      busy.current = false; setProcessing(false);
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
