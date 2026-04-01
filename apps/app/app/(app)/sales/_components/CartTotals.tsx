import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type CartState, type MiscFee } from "@/lib/utils/pos-engine";

interface CartTotalsProps {
  cart: CartState;
  fees: MiscFee[];
  taxEnabled: boolean;
  amountPaid: string;
  setAmountPaid: (val: string) => void;
  showAmountPaidMode: boolean;
  processing: boolean;
  onCheckout: () => void;
}

export function CartTotals({
  cart,
  fees,
  taxEnabled,
  amountPaid,
  setAmountPaid,
  showAmountPaidMode,
  processing,
  onCheckout,
}: CartTotalsProps) {
  return (
    <>
      <div className="space-y-2 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>${cart.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax:</span>
          <span>
            ${cart.tax_amount.toFixed(2)}
            {!taxEnabled && (
              <span className="ml-2 text-xs text-muted-foreground">
                (Disabled)
              </span>
            )}
          </span>
        </div>
        {fees.length > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Fees:</span>
            <span>
              ${fees.reduce((sum, f) => sum + f.amount, 0).toFixed(2)}
            </span>
          </div>
        )}
        {cart.delivery_price > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Delivery:</span>
            <span>${cart.delivery_price.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          <span>${cart.total.toFixed(2)}</span>
        </div>
      </div>

      {showAmountPaidMode && (
        <div className="space-y-2 pt-4 border-t">
          <Label>Amount Tendered</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Enter amount"
              className="flex-1"
            />
            {amountPaid && parseFloat(amountPaid) >= cart.total && (
              <div className="flex-1 flex items-center justify-center bg-green-100 text-green-800 rounded px-2 font-medium">
                Change: ${(parseFloat(amountPaid) - cart.total).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="w-full font-bold text-lg"
        onClick={onCheckout}
        disabled={cart.items.length === 0 || processing}
      >
        {processing ? "Processing..." : `Checkout $${cart.total.toFixed(2)}`}
      </Button>
    </>
  );
}
