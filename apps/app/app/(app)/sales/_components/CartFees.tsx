import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type MiscFee } from "@/lib/utils/pos-engine";

interface CartFeesProps {
  fees: MiscFee[];
  setFees: (fees: MiscFee[]) => void;
}

export function CartFees({ fees, setFees }: CartFeesProps) {
  return (
    <div className="space-y-2 pt-4 border-t">
      <Label>
        Additional Fees
        <HelpTooltip content="Add processing fees, delivery charges, or other misc costs to this sale." />
      </Label>
      {fees.map((fee, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-2">
          <Input
            placeholder="Type"
            value={fee.type}
            onChange={(e) => {
              const newFees = [...fees];
              newFees[idx].type = e.target.value;
              setFees(newFees);
            }}
            className="flex-1 h-8 text-sm"
          />
          <Input
            type="number"
            placeholder="Amount"
            value={fee.amount}
            onChange={(e) => {
              const newFees = [...fees];
              newFees[idx].amount = parseFloat(e.target.value) || 0;
              setFees(newFees);
            }}
            className="w-20 h-8 text-sm"
            min="0"
            step="0.01"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newFees = fees.filter((_, i) => i !== idx);
              setFees(newFees);
            }}
            className="h-8 w-8 p-0 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setFees([...fees, { type: "", amount: 0 }])}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Fee
      </Button>
    </div>
  );
}
