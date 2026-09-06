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

interface PaymentSectionProps {
  paymentMethod: string;
  onMethodChange: (val: any) => void;
  paymentRef: string | undefined;
  onRefChange: (val: string) => void;
}

export function PaymentSection({
  paymentMethod,
  onMethodChange,
  paymentRef,
  onRefChange,
}: PaymentSectionProps) {
  return (
    <div className="space-y-2">
      <Label>
        Payment Method
        <HelpTooltip content="Choose how the customer is paying. 'Credit' adds the sale to the customer's account. For 'Mixed', any unpaid amount is added to that customer's credit balance." />
      </Label>
      <Select value={paymentMethod} onValueChange={onMethodChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cash">Cash</SelectItem>
          <SelectItem value="card">Card</SelectItem>
          <SelectItem value="credit">Credit</SelectItem>
          <SelectItem value="zelle">Zelle</SelectItem>
          <SelectItem value="mixed">Mixed</SelectItem>
        </SelectContent>
      </Select>

      {paymentMethod === "zelle" && (
        <div className="pt-2 anim-slide-in">
          <Label>Reference / Note</Label>
          <Input
            placeholder="Enter Zelle confirmation #"
            value={paymentRef || ""}
            onChange={(e) => onRefChange(e.target.value)}
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
}
