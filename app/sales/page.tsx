"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  POSEngine,
  type CartState,
  type MiscFee,
} from "@/lib/utils/pos-engine";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Trash2, Plus, Minus, ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";

export default function SalesPage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);
  const [posEngine] = useState(() => new POSEngine());
  const [cart, setCart] = useState<CartState>(posEngine.getCart());
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<
    string | undefined
  >();
  const [processing, setProcessing] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [fees, setFees] = useState<MiscFee[]>([]);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!business?.id || !supabase) return;

    supabase
      .from("customers")
      .select("id, first_name, last_name, phone_number")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("first_name")
      .then(({ data }) => {
        if (data) setCustomers(data);
      });
  }, [business?.id, supabase]);

  const filteredInventory = inventory.filter(
    (item) =>
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (item: any) => {
    if (item.quantity_on_hand <= 0) {
      toast.error("Item is out of stock");
      return;
    }

    posEngine.addItem({
      inventory_id: item.id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: 1,
      unit_price: Number(item.selling_price || 0),
    });
    setCart(posEngine.getCart());
    toast.success(`${item.product_name} added to cart`);
  };

  const handleUpdateQuantity = (inventory_id: string, delta: number) => {
    const item = cart.items.find((i) => i.inventory_id === inventory_id);
    if (item) {
      posEngine.updateQuantity(inventory_id, item.quantity + delta);
      setCart(posEngine.getCart());
    }
  };

  const handleRemoveItem = (inventory_id: string) => {
    posEngine.removeItem(inventory_id);
    setCart(posEngine.getCart());
    toast.success("Item removed from cart");
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    if (processing) {
      return;
    }

    setProcessing(true);
    try {
      posEngine.setCustomer(selectedCustomer);
      const result = await posEngine.checkout(business.id, fees);

      if (result.success) {
        toast.success(`Order completed! Order ID: ${result.sale_id}`);
        posEngine.clearCart();
        setCart(posEngine.getCart());
        setSelectedCustomer(undefined);
        setFees([]);
      } else {
        toast.error(result.error || "Checkout failed");
        setProcessing(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
      setProcessing(false);
    }
  };

  if (businessLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!business) {
    return (
      <div className="p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <p className="text-muted-foreground mt-2">
          Process sales and manage transactions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredInventory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No items found
                </p>
              ) : (
                filteredInventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.sku} • Stock: {item.quantity_on_hand} • $
                        {Number(item.selling_price || 0).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleAddToCart(item)}
                      disabled={item.quantity_on_hand <= 0}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>
                Customer (Optional)
                <HelpTooltip content="Select a customer to track their purchase history and credit. Leave as 'Walk-in' for anonymous sales." />
              </Label>
              <div className="flex gap-2">
                <Select
                  value={selectedCustomer || ""}
                  onValueChange={setSelectedCustomer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Walk-in</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cart Items */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {cart.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Cart is empty
                </p>
              ) : (
                cart.items.map((item) => (
                  <div
                    key={item.inventory_id}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${item.unit_price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateQuantity(item.inventory_id, -1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateQuantity(item.inventory_id, 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.inventory_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Misc Fees Section */}
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

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>${cart.tax_amount.toFixed(2)}</span>
              </div>
              {fees.length > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Fees:</span>
                  <span>
                    ${fees.reduce((sum, f) => sum + f.amount, 0).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>
                  $
                  {(
                    cart.total + fees.reduce((sum, f) => sum + f.amount, 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>
                Payment Method
                <HelpTooltip content="Choose how the customer is paying. 'Credit' will add to their account balance for later payment." />
              </Label>
              <Select
                value={cart.payment_method}
                onValueChange={(value: any) => {
                  posEngine.setPaymentMethod(value);
                  setCart(posEngine.getCart());
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              disabled={cart.items.length === 0 || processing}
              className="w-full"
              size="lg"
            >
              {processing
                ? "Processing..."
                : `Checkout - $${cart.total.toFixed(2)}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
