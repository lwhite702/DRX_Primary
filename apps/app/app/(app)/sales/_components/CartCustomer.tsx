import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { LoyaltyBadge } from "@/components/pos/loyalty-badge";

interface CartCustomerProps {
  selectedCustomer?: string;
  customers: any[];
  customerLoyalty?: any;
  onSelectClick: () => void;
}

export function CartCustomer({
  selectedCustomer,
  customers,
  customerLoyalty,
  onSelectClick,
}: CartCustomerProps) {
  const customer = selectedCustomer
    ? customers.find((c) => c.id === selectedCustomer)
    : null;

  return (
    <div className="space-y-2">
      <Label>
        Customer (Optional)
        <HelpTooltip content="Select a customer to track their purchase history and credit. Leave as 'Walk-in' for anonymous sales." />
      </Label>
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={onSelectClick}
      >
        {customer
          ? `${customer.first_name} ${customer.last_name}`
          : selectedCustomer
            ? "Unknown Customer"
            : "Walk-in Customer"}
      </Button>
      {customerLoyalty && customerLoyalty.loyalty_tier !== "none" && (
        <div className="mt-2">
          <LoyaltyBadge
            tier={customerLoyalty.loyalty_tier}
            discount_rate={customerLoyalty.discount_rate}
            purchase_count={customerLoyalty.purchase_count}
          />
        </div>
      )}
    </div>
  );
}
