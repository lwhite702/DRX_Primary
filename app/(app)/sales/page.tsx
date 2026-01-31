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
  PackageOpen,
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
import { PermissionGuard } from "@/components/auth/role-guard";
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";
import { SalesSkeleton } from "@/components/skeletons/sales-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useCustomerContext } from "@/components/providers/customer-provider";
import { POSReviewModal } from "@/components/pos/pos-review-modal";

export default function SalesPage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);
  const [posEngine] = useState(() => new POSEngine());
  const [cart, setCart] = useState<CartState>(posEngine.getCart());
  const { customers } = useCustomerContext();
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
  const [aliases, setAliases] = useState<any[]>([]);
  const { canOverridePrice } = useUserRole(business?.id);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [managerPin, setManagerPin] = useState("1234"); // Default, will be overwritten by settings
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const supabase = getSupabaseClient();

  // Load aliases for search matching
  useEffect(() => {
    if (business?.id && supabase) {
      supabase
        .from("product_unit_aliases")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_enabled", true)
        .then(({ data }) => setAliases(data || []));
    }
  }, [business?.id, supabase]);

  useEffect(() => {
    // Customers are now handled by CustomerContext
  }, [business?.id]);

  // Load customer loyalty info when customer is selected
  useEffect(() => {
    if (!selectedCustomer || !business?.id) return;

    const loadLoyalty = async () => {
      const loyalty = await posWeightEngine.getLoyaltyInfo(
        business.id,
        selectedCustomer,
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
        business.id,
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
        business.id,
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
        .select("collect_tax, pos_manager_pin")
        .eq("business_id", business.id)
        .single();

      if (data) {
        const taxCollectionEnabled = data.collect_tax !== false;
        setTaxEnabled(taxCollectionEnabled);
        if (data.pos_manager_pin) {
          setManagerPin(data.pos_manager_pin);
        }
        posEngine.setTaxEnabled(taxCollectionEnabled);
        setCart(posEngine.getCart());
      }
    };

    loadTaxSettings();
  }, [business?.id, supabase, posEngine]);

  const filteredInventory = inventory.filter(
    (item) =>
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()),
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
      unit_cost: Number(item.unit_cost || 0),
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
        toast.success(`Sale completed! Order ID: ${result.sale_id}`);
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
    recommendation: AIPricingRecommendation,
  ) => {
    if (!business?.id) return;

    try {
      const result = await posEngine.applyAIPricingRecommendation(
        business.id,
        recommendation.id,
      );

      if (result.success) {
        toast.success(`Price updated to ${result.newPrice?.toFixed(2)}`);
        setAiRecommendations(
          aiRecommendations.filter((r) => r.id !== recommendation.id),
        );
      } else {
        toast.error(result.message || "Failed to apply pricing");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply pricing",
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
        reason,
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
    return <SalesSkeleton />;
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-6 space-y-6 page-transition">
      <div className="noise-overlay" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h1 className="headline-text text-3xl tracking-widest text-muted-foreground">
            POINT OF SALE
          </h1>
          <p className="technical-label text-xs text-muted-foreground/60 mt-1">
            TERMINAL: {business?.name?.toUpperCase() || "MAIN"} •{" "}
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Inventory Selection and AI Pricing */}
        <div className="lg:col-span-8 space-y-6">
          <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="headline-text text-xl">INVENTORY</h2>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="SEARCH ITEM OR SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-muted/50 border-white/10 focus:border-accent/50 text-lg uppercase tracking-wide rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredInventory.length === 0 ? (
                  <EmptyState
                    icon={PackageOpen}
                    title="NO ITEMS FOUND"
                    description={
                      inventory.length === 0
                        ? "Inventory is empty."
                        : "No matching items found."
                    }
                    className="py-12 border-dashed border-white/10 bg-transparent"
                  />
                ) : (
                  filteredInventory.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between p-4 border border-white/5 rounded-xl bg-card/30 hover:bg-accent/5 hover:border-accent/30 transition-all duration-300"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg tracking-tight">
                            {item.product_name}
                          </h3>
                          {item.quantity_on_hand <= item.reorder_level && (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20 uppercase font-bold tracking-wider">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="font-mono text-xs opacity-70">
                            {item.sku}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span
                            className={
                              item.quantity_on_hand > 0
                                ? "text-accent"
                                : "text-destructive"
                            }
                          >
                            {item.base_unit === "g"
                              ? `${(
                                  item.inventory_in_grams ||
                                  item.quantity_on_hand
                                ).toFixed(2)}g`
                              : `${item.quantity_on_hand} units`}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="font-mono text-foreground font-bold text-base">
                            ${Number(item.selling_price || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {item.base_unit === "g" &&
                          item.inventory_in_grams > 0 && (
                            <Button
                              onClick={() => {
                                setSelectedProductForWeight(item);
                                setShowWeightEntry(true);
                              }}
                              disabled={item.inventory_in_grams <= 0}
                              size="sm"
                              variant="secondary"
                              className="h-9 px-4 uppercase font-bold text-xs tracking-wider"
                            >
                              Scale
                            </Button>
                          )}
                        <Button
                          onClick={() => handleAddToCart(item)}
                          disabled={item.quantity_on_hand <= 0}
                          size="sm"
                          className="h-9 px-6 bg-accent text-accent-foreground hover:bg-accent/90 uppercase font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(191,255,0,0.3)]"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

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
        <div className="lg:col-span-4 space-y-4">
          <div className="luminosity-card rounded-xl bg-card border-border h-full flex flex-col shadow-2xl shadow-black/50">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2 text-accent">
                <ShoppingCart className="h-5 w-5" />
                <h2 className="headline-text text-lg tracking-wider">
                  CURRENT CART
                </h2>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col space-y-4">
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
                  <EmptyState
                    icon={ShoppingCart}
                    title="Cart is empty"
                    description="Scan items or select from inventory to start a sale."
                    className="py-4 border-none shadow-none"
                  />
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
                          <PermissionGuard requiredPermission="pricing.manage">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePriceOverride(item)}
                              title="Override Price"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          </PermissionGuard>
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
                        <Input
                          type="number"
                          className="w-16 h-8 text-center p-1"
                          value={item.quantity}
                          step="0.01"
                          min="0.01"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) {
                              posEngine.updateQuantity(item.inventory_id, val);
                              setCart(posEngine.getCart());
                            }
                          }}
                        />
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
                              deliveryPrice,
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
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>${cart.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Amount Paid - Optional */}
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
                        Change: $
                        {(parseFloat(amountPaid) - cart.total).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                size="lg"
                className="w-full font-bold text-lg"
                onClick={() => {
                  if (cart.items.length === 0) {
                    toast.error("Cart is empty");
                    return;
                  }
                  setReviewModalOpen(true);
                }}
                disabled={cart.items.length === 0 || processing}
              >
                {processing
                  ? "Processing..."
                  : `Checkout $${cart.total.toFixed(2)}`}
              </Button>

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
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Payment Reference (Zelle) */}
                {cart.payment_method === "zelle" && (
                  <div className="pt-2 anim-slide-in">
                    <Label>Reference / Note</Label>
                    <Input
                      placeholder="Enter Zelle confirmation #"
                      value={cart.payment_ref || ""}
                      onChange={(e) => {
                        posEngine.setPaymentRef(e.target.value);
                        setCart(posEngine.getCart());
                      }}
                      className="mt-1"
                    />
                  </div>
                )}
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
                onClick={() => {
                  if (cart.items.length === 0) {
                    toast.error("Cart is empty");
                    return;
                  }
                  setReviewModalOpen(true);
                }}
                disabled={cart.items.length === 0 || processing}
                className="w-full laser-button bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-xl h-16 tracking-widest uppercase shadow-[0_0_20px_rgba(191,255,0,0.4)]"
              >
                {processing
                  ? "PROCESSING..."
                  : `CHECKOUT $${cart.total.toFixed(2)}`}
              </Button>
            </div>
          </div>
        </div>
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

      <POSReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        items={cart.items.map((item) => {
          const invItem = inventory.find((i) => i.id === item.inventory_id);
          return {
            id: item.inventory_id,
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            unit: invItem?.base_unit || "ea",
            weightGrams: invItem?.base_unit === "g" ? item.quantity : undefined,
          };
        })}
        subtotal={cart.subtotal}
        tax={cart.tax_amount}
        total={cart.total}
        customer={
          selectedCustomer
            ? {
                name:
                  customers.find((c) => c.id === selectedCustomer)?.first_name +
                  " " +
                  customers.find((c) => c.id === selectedCustomer)?.last_name,
                id: selectedCustomer,
              }
            : undefined
        }
        onConfirm={async () => {
          await handleCheckout();
          setReviewModalOpen(false);
        }}
      />
    </div>
  );
}
