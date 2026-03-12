import { Minus, Plus, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart } from "lucide-react";
import { PermissionGuard } from "@/components/auth/role-guard";
import { type CartState } from "@/lib/utils/pos-engine";
import { drxCopy } from "@/lib/copy/drx";

interface CartItemsProps {
  cart: CartState;
  onUpdateQuantity: (id: string, delta: number) => void;
  onSetQuantity: (id: string, val: number) => void;
  onRemoveItem: (id: string) => void;
  onOverridePrice: (item: any) => void;
  canOverridePrice: boolean;
}

export function CartItems({
  cart,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onOverridePrice,
  canOverridePrice,
}: CartItemsProps) {
  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title={drxCopy.pos.cart.emptyTitle}
        description={drxCopy.pos.cart.emptyBody}
        className="py-4 border-none shadow-none"
      />
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {cart.items.map((item) => (
        <div
          key={item.inventory_id}
          className="flex items-start gap-2 p-2 border rounded"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{item.product_name}</p>
              {item.overridden_price && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                  ⚠️ {drxCopy.pos.cart.overrideBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ${item.unit_price.toFixed(2)} × {item.quantity}
              {item.overridden_price && item.original_price && (
                <span className="ml-2 line-through text-muted-foreground">
                  ({drxCopy.pos.cart.wasPrice} ${item.original_price.toFixed(2)})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {canOverridePrice && (
              <PermissionGuard requiredPermission="pricing.manage">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOverridePrice(item)}
                  title={drxCopy.pos.cart.overrideTitle}
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQuantity(item.inventory_id, -1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              className="w-16 h-8 text-center p-1"
              value={item.quantity}
              step="0.01"
              min="0.01"
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  onSetQuantity(item.inventory_id, val);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQuantity(item.inventory_id, 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveItem(item.inventory_id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
