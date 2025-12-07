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
  type DeliveryOption,
  type AIPricingRecommendation,
} from "@/lib/utils/pos-engine";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Search,
  Truck,
  Zap,
  Lock,
  Package,
  BarChart3,
  User,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { ShrinkageForm } from "@/components/pos/shrinkage-form";
import { InventoryCheckModal } from "@/components/pos/inventory-check-modal";
import { WeightEntryModal } from "@/components/pos/weight-entry-modal";
import { NoSaleButton } from "@/components/pos/no-sale-button";
import { LoyaltyBadge } from "@/components/pos/loyalty-badge";
import { PriceOverrideModal } from "@/components/pos/price-override-modal";
import { CustomerSelectorModal } from "@/components/pos/customer-selector-modal";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";

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
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<
    AIPricingRecommendation[]
  >([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");
  const [showAmountPaidMode, setShowAmountPaidMode] = useState(false);

  // New features for weight-based sales, shrinkage, and loyalty
  const [showShrinkageForm, setShowShrinkageForm] = useState(false);
  const [showInventoryCheck, setShowInventoryCheck] = useState(false);
  const [showWeightEntry, setShowWeightEntry] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] =
    useState<any>(null);
  const [customerLoyalty, setCustomerLoyalty] = useState<any>(null);
  const [showLoyaltyDiscount, setShowLoyaltyDiscount] = useState(false);

  // Price override and customer selector
  const [showPriceOverride, setShowPriceOverride] = useState(false);
  const [selectedItemForOverride, setSelectedItemForOverride] =
    useState<any>(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const { canOverridePrice } = useUserRole(business?.id);
  const [taxEnabled, setTaxEnabled] = useState(true);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!business?.id || !supabase) return;

    supabase
      .from("customers")
      .select(
        "id, first_name, last_name, phone_number, loyalty_tier, discount_rate, purchase_count"
      )
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("first_name")
      .then(({ data }: { data: any[] | null }) => {
        if (data) setCustomers(data);
      });
  }, [business?.id, supabase]);

  // Load customer loyalty info when customer is selected
  useEffect(() => {
    if (!selectedCustomer || !business?.id) return;

    const loadLoyalty = async () => {
      const loyalty = await posWeightEngine.getLoyaltyInfo(
        business.id,
        selectedCustomer
      );
      setCustomerLoyalty(loyalty);
    };

    loadLoyalty();
  }, [selectedCustomer, business?.id]);

  // Check if random inventory check should be triggered
  useEffect(() => {
    if (!business?.id) return;

    const checkRandomTrigger = async () => {
      const result = await posWeightEngine.shouldTriggerRandomCheck(
        business.id
      );
      if (result.should_check) {
        setShowInventoryCheck(true);
      }
    };

    // Don't check on every render, only on significant events
  }, []);

  useEffect(() => {
    if (!business?.id) return;

    const loadDeliveryOptions = async () => {
      const options = await posEngine.getDeliveryOptions(business.id);
      setDeliveryOptions(options);
    };

    const loadAIPricingRecommendations = async () => {
      const recommendations = await posEngine.getAIPricingRecommendations(
        business.id
      );
      setAiRecommendations(recommendations);
    };

    loadDeliveryOptions();
    loadAIPricingRecommendations();
  }, [business?.id]);

  // Load tax collection setting
  useEffect(() => {
    if (!business?.id || !supabase) return;

    const loadTaxSettings = async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("collect_tax")
        .eq("business_id", business.id)
        .single();

      if (data) {
        const taxCollectionEnabled = data.collect_tax !== false;
        setTaxEnabled(taxCollectionEnabled);
        posEngine.setTaxEnabled(taxCollectionEnabled);
        setCart(posEngine.getCart());
      }
    };

    loadTaxSettings();
  }, [business?.id, supabase, posEngine]);

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

  const handleAddWeightedItem = (item: {
    inventory_id: string;
    product_name: string;
    sku: string;
    weight_grams: number;
    unit_price: number;
    bulk_tier_applied?: string;
    line_total: number;
  }) => {
    posEngine.addItem({
      inventory_id: item.inventory_id,
      product_name: `${item.product_name} (${item.weight_grams.toFixed(2)}g)`,
      sku: item.sku,
      quantity: 1,
      unit_price: item.line_total,
    });
    setCart(posEngine.getCart());
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

      if (amountPaid) {
        posEngine.setAmountPaid(parseFloat(amountPaid));
      }

      const result = await posEngine.checkout(business.id, fees);

      if (result.success) {
        toast.success(`Order completed! Order ID: ${result.sale_id}`);
        posEngine.clearCart();
        setCart(posEngine.getCart());
        setSelectedCustomer(undefined);
        setFees([]);
        setAmountPaid("");
        setDeliveryAddress("");
        setDeliveryPrice(0);
        setShowAmountPaidMode(false);
      } else {
        toast.error(result.error || "Checkout failed");
        setProcessing(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
      setProcessing(false);
    }
  };

  const handleDeliveryChange = (deliveryId: string) => {
    const selected = deliveryOptions.find((d) => d.id === deliveryId);
    if (selected) {
      posEngine.setDelivery(deliveryId, deliveryAddress, selected.base_price);
      setDeliveryPrice(selected.base_price);
      setCart(posEngine.getCart());
    }
  };

  const handleApplyAIPricing = async (
    recommendation: AIPricingRecommendation
  ) => {
    if (!business?.id) return;

    try {
      const result = await posEngine.applyAIPricingRecommendation(
        business.id,
        recommendation.id
      );

      if (result.success) {
        toast.success(`Price updated to ${result.newPrice?.toFixed(2)}`);
        setAiRecommendations(
          aiRecommendations.filter((r) => r.id !== recommendation.id)
        );
      } else {
        toast.error(result.message || "Failed to apply pricing");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply pricing"
      );
    }
  };

  // Handle price override
  const handlePriceOverride = (item: any) => {
    setSelectedItemForOverride(item);
    setShowPriceOverride(true);
  };

  const handleConfirmPriceOverride = (newPrice: number, reason?: string) => {
    if (selectedItemForOverride) {
      posEngine.overrideItemPrice(
        selectedItemForOverride.inventory_id,
        newPrice,
        reason
      );
      setCart(posEngine.getCart());
      toast.success(`Price overridden to $${newPrice.toFixed(2)}`);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId || undefined);
    posEngine.setCustomer(customerId || undefined);
    setCart(posEngine.getCart());
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
        {/* Inventory Selection and AI Pricing */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
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
                          SKU: {item.sku} • Stock:{" "}
                          {item.base_unit === "g"
                            ? `${(
                                item.inventory_in_grams || item.quantity_on_hand
                              ).toFixed(2)}g`
                            : item.quantity_on_hand}{" "}
                          • ${Number(item.selling_price || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {item.base_unit === "g" &&
                          item.inventory_in_grams > 0 && (
                            <Button
                              onClick={() => {
                                setSelectedProductForWeight(item);
                                setShowWeightEntry(true);
                              }}
                              disabled={item.inventory_in_grams <= 0}
                              size="sm"
                              variant="outline"
                              title="Weight-based sale"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          )}
                        <Button
                          onClick={() => handleAddToCart(item)}
                          disabled={item.quantity_on_hand <= 0}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Pricing Recommendations */}
          {aiRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  AI Price Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {aiRecommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{rec.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Confidence: {rec.confidence_score}%
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold px-2 py-1 rounded ${
                            rec.price_change_percentage > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {rec.price_change_percentage > 0 ? "+" : ""}
                          {rec.price_change_percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p className="font-medium">
                            ${rec.current_price.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-muted-foreground">→</div>
                        <div>
                          <p className="text-muted-foreground">Recommended</p>
                          <p className="font-medium">
                            ${rec.recommended_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {rec.recommendation_reason && (
                        <p className="text-xs text-muted-foreground italic">
                          {rec.recommendation_reason}
                        </p>
                      )}
                      <Button
                        onClick={() => handleApplyAIPricing(rec)}
                        size="sm"
                        className="w-full"
                        variant="outline"
                      >
                        Apply Recommendation
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

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
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowCustomerSelector(true)}
              >
                <User className="h-4 w-4 mr-2" />
                {selectedCustomer
                  ? customers.find((c) => c.id === selectedCustomer)
                    ? `${
                        customers.find((c) => c.id === selectedCustomer)
                          ?.first_name
                      } ${
                        customers.find((c) => c.id === selectedCustomer)
                          ?.last_name
                      }`
                    : "Select Customer"
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
                    className="flex items-start gap-2 p-2 border rounded"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {item.product_name}
                        </p>
                        {item.overridden_price && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            ⚠️ Override
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${item.unit_price.toFixed(2)} × {item.quantity}
                        {item.overridden_price && item.original_price && (
                          <span className="ml-2 line-through text-muted-foreground">
                            (was ${item.original_price.toFixed(2)})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {canOverridePrice && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePriceOverride(item)}
                          title="Override Price"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
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

            {/* Delivery Management Section */}
            <div className="space-y-2 pt-4 border-t">
              <Label>
                <Truck className="h-4 w-4 inline mr-2" />
                Delivery Management
                <HelpTooltip content="Select delivery option and address for this order." />
              </Label>
              {deliveryOptions.length > 0 ? (
                <>
                  <Select
                    value={cart.delivery_management_id || "no-delivery"}
                    onValueChange={(value) => {
                      if (value === "no-delivery") {
                        posEngine.setDelivery(undefined, "", 0);
                        setDeliveryPrice(0);
                        setDeliveryAddress("");
                        setCart(posEngine.getCart());
                      } else {
                        handleDeliveryChange(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-delivery">No Delivery</SelectItem>
                      {deliveryOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}{" "}
                          {option.provider && `(${option.provider})`} - $
                          {option.base_price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cart.delivery_management_id && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Delivery Address"
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value);
                          posEngine.setDelivery(
                            cart.delivery_management_id,
                            e.target.value,
                            deliveryPrice
                          );
                          setCart(posEngine.getCart());
                        }}
                        className="h-8 text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Price:
                        </span>
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
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Amount Paid Section */}
            <div className="space-y-2 pt-4 border-t">
              <Label>
                Amount Paid
                <HelpTooltip content="Enter the amount customer paid. System will calculate change." />
              </Label>
              <Input
                type="number"
                placeholder="Enter amount paid"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="text-sm"
                min="0"
                step="0.01"
              />
              {amountPaid && cart.total > 0 && (
                <div className="space-y-1 p-2 bg-muted rounded-sm text-sm">
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span className="font-medium">
                      ${parseFloat(amountPaid).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">
                      ${cart.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600 font-bold border-t pt-1">
                    <span>Change:</span>
                    <span>
                      ${(parseFloat(amountPaid) - cart.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
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

            {/* POS Admin Actions */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-xs font-semibold">Admin Functions</Label>
              <div className="grid grid-cols-2 gap-2">
                <NoSaleButton businessId={business.id} />
                <Button
                  onClick={() => setShowShrinkageForm(true)}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                >
                  <Lock className="h-4 w-4" />
                  Shrinkage
                </Button>
                <Button
                  onClick={() => setShowInventoryCheck(true)}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                >
                  <Package className="h-4 w-4" />
                  Inv. Check
                </Button>
                <Button
                  onClick={() => (window.location.href = "/reports")}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                >
                  <BarChart3 className="h-4 w-4" />
                  Reports
                </Button>
              </div>
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
                : `Checkout - ${cart.total.toFixed(2)}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <ShrinkageForm
        open={showShrinkageForm}
        onClose={() => setShowShrinkageForm(false)}
        businessId={business?.id || ""}
        onSuccess={() => setShowShrinkageForm(false)}
      />
      <InventoryCheckModal
        open={showInventoryCheck}
        onClose={() => setShowInventoryCheck(false)}
        businessId={business?.id || ""}
        onSuccess={() => setShowInventoryCheck(false)}
      />
      <WeightEntryModal
        open={showWeightEntry}
        onClose={() => {
          setShowWeightEntry(false);
          setSelectedProductForWeight(null);
        }}
        product={selectedProductForWeight}
        businessId={business?.id || ""}
        onAddToCart={handleAddWeightedItem}
      />

      {/* Price Override Modal */}
      <PriceOverrideModal
        open={showPriceOverride}
        onOpenChange={setShowPriceOverride}
        productName={selectedItemForOverride?.product_name || ""}
        currentPrice={selectedItemForOverride?.unit_price || 0}
        onConfirm={handleConfirmPriceOverride}
      />

      {/* Customer Selector Modal */}
      <CustomerSelectorModal
        open={showCustomerSelector}
        onOpenChange={setShowCustomerSelector}
        customers={customers}
        onSelect={handleCustomerSelect}
        selectedCustomerId={selectedCustomer}
      />
    </div>
  );
}
