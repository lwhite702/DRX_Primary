import { Truck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { type DeliveryOption } from "@/lib/utils/pos-engine";

interface CartDeliveryProps {
  selectedDeliveryId?: string;
  deliveryOptions: DeliveryOption[];
  deliveryAddress: string;
  deliveryPrice: number;
  onDeliveryChange: (id: string) => void;
  onAddressChange: (address: string) => void;
}

export function CartDelivery({
  selectedDeliveryId,
  deliveryOptions,
  deliveryAddress,
  deliveryPrice,
  onDeliveryChange,
  onAddressChange,
}: CartDeliveryProps) {
  return (
    <div className="space-y-2 pt-4 border-t">
      <Label>
        <Truck className="h-4 w-4 inline mr-2" />
        Delivery Management
        <HelpTooltip content="Select delivery option and address for this order." />
      </Label>
      {deliveryOptions.length > 0 ? (
        <>
          <Select
            value={selectedDeliveryId || "no-delivery"}
            onValueChange={(value) => onDeliveryChange(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select delivery option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-delivery">No Delivery</SelectItem>
              {deliveryOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name} {option.provider && `(${option.provider})`} - $
                  {option.base_price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDeliveryId && (
            <div className="space-y-2">
              <Input
                placeholder="Delivery Address"
                value={deliveryAddress}
                onChange={(e) => onAddressChange(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Price:</span>
                <span className="text-sm font-medium">
                  ${deliveryPrice.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No delivery options configured
        </p>
      )}
    </div>
  );
}
