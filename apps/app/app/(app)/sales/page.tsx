"use client";

import { useState, useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

// Hooks
import { useSalesCart } from "./_hooks/useSalesCart";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useCustomerContext } from "@/components/providers/customer-provider";

// Utils
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";
import {
  type DeliveryOption,
  type AIPricingRecommendation,
} from "@/lib/utils/pos-engine";

// Components
import { SalesSkeleton } from "@/components/skeletons/sales-skeleton";
import { ShrinkageForm } from "@/components/pos/shrinkage-form";
import { InventoryCheckModal } from "@/components/pos/inventory-check-modal";
import { WeightEntryModal } from "@/components/pos/weight-entry-modal";
import { PriceOverrideModal } from "@/components/pos/price-override-modal";
import { CustomerSelectorModal } from "@/components/pos/customer-selector-modal";
import { POSReviewModal } from "@/components/pos/pos-review-modal";

// Refactored sub-components
import { ProductSearch } from "./_components/ProductSearch";
import { AIPricingWidget } from "./_components/AIPricingWidget";
import { CartCustomer } from "./_components/CartCustomer";
import { CartItems } from "./_components/CartItems";
import { CartDelivery } from "./_components/CartDelivery";
import { CartFees } from "./_components/CartFees";
import { CartTotals } from "./_components/CartTotals";
import { PaymentSection } from "./_components/PaymentSection";
import { AdminActions } from "./_components/AdminActions";
import { drxCopy } from "@/lib/copy/drx";

export default function SalesPage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);
  const { customers } = useCustomerContext();
  const { canOverridePrice } = useUserRole(business?.id);

  // Custom hook for cart logic
  const {
    posEngine,
    cart,
    fees,
    setFees,
    processing,
    addToCart,
    addWeightedItem,
    updateQuantity,
    setQuantity,
    removeFromCart,
    setCustomer,
    processCheckout,
    overridePrice,
    setDelivery,
    setTaxEnabled,
    applyAIPricing,
    // setAmountPaid: setEngineAmountPaid - unused
  } = useSalesCart(business?.id);

  // Local UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<
    string | undefined
  >();
  // const [showCustomerDialog, setShowCustomerDialog] = useState(false); - unused
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<
    AIPricingRecommendation[]
  >([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");
  const [showAmountPaidMode, setShowAmountPaidMode] = useState(false);

  // Modals State
  const [showShrinkageForm, setShowShrinkageForm] = useState(false);
  const [showInventoryCheck, setShowInventoryCheck] = useState(false);
  const [showWeightEntry, setShowWeightEntry] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] =
    useState<any>(null);
  const [customerLoyalty, setCustomerLoyalty] = useState<any>(null);

  // Price Override State
  const [showPriceOverride, setShowPriceOverride] = useState(false);
  const [selectedItemForOverride, setSelectedItemForOverride] =
    useState<any>(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  // const [aliases, setAliases] = useState<any[]>([]); - unused
  // const [managerPin, setManagerPin] = useState("1234"); - unused
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [taxEnabledLocal, setTaxEnabledLocal] = useState(true);

  // --- Effects ---

  // Load aliases - unused
  /*
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
  */

  // Load customer loyalty
  useEffect(() => {
    if (!selectedCustomer || !business?.id) {
      setCustomerLoyalty(null);
      return;
    }
    const loadLoyalty = async () => {
      const loyalty = await posWeightEngine.getLoyaltyInfo(
        business.id,
        selectedCustomer,
      );
      setCustomerLoyalty(loyalty);
    };
    loadLoyalty();
  }, [selectedCustomer, business?.id]);

  // Random inventory check
  useEffect(() => {
    if (!business?.id) return;
    const checkRandomTrigger = async () => {
      const result = await posWeightEngine.shouldTriggerRandomCheck(
        business.id,
      );
      if (result.should_check) setShowInventoryCheck(true);
    };
    // Initialize check
    checkRandomTrigger();
  }, [business?.id]);

  // Load delivery options & AI recommendations
  useEffect(() => {
    if (!business?.id) return;
    const loadData = async () => {
      const options = await posEngine.getDeliveryOptions(business.id);
      setDeliveryOptions(options);

      const recs = await posEngine.getAIPricingRecommendations(business.id);
      setAiRecommendations(recs);
    };
    loadData();
  }, [business?.id, posEngine]);

  // Load tax settings
  useEffect(() => {
    if (!business?.id) return;
    const loadTaxSettings = async () => {
      try {
        const res = await fetch("/api/business/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();

        if (data) {
          const enabled = data.collect_tax !== false;
          setTaxEnabledLocal(enabled);
          setTaxEnabled(enabled);
        }
      } catch (error) {
        console.error("Error loading tax settings:", error);
      }
    };
    loadTaxSettings();
  }, [business?.id, setTaxEnabled]);

  // --- Handlers ---

  const handleDeliveryChange = (deliveryId: string) => {
    if (deliveryId === "no-delivery") {
      setDelivery(undefined, "", 0);
      setDeliveryPrice(0);
      setDeliveryAddress("");
    } else {
      const selected = deliveryOptions.find((d) => d.id === deliveryId);
      if (selected) {
        setDelivery(deliveryId, deliveryAddress, selected.base_price);
        setDeliveryPrice(selected.base_price);
      }
    }
  };

  const handleAddressChange = (addr: string) => {
    setDeliveryAddress(addr);
    // Update delivery with new address but same ID and price
    if (cart.delivery_management_id) {
      setDelivery(cart.delivery_management_id, addr, deliveryPrice);
    }
  };

  const handleApplyAIPricingWrapper = async (rec: AIPricingRecommendation) => {
    if (!business?.id) return;
    try {
      const result = await applyAIPricing(business.id, rec.id);
      if (result.success) {
        toast.success(
          `${drxCopy.pos.cart.priceUpdatedTo} ${result.newPrice?.toFixed(2)}`,
        );
        setAiRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
      } else {
        toast.error(result.message || drxCopy.pos.cart.priceApplyFailed);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId || undefined);
    setCustomer(customerId || undefined);
  };

  const handleCheckoutWrapper = async () => {
    try {
      const result = await processCheckout(selectedCustomer, amountPaid);
      if (result.success) {
        toast.success(`${drxCopy.pos.cart.saleComplete} ${result.sale_id}`);
        setSelectedCustomer(undefined);
        setAmountPaid("");
        setDeliveryAddress("");
        setDeliveryPrice(0);
        setShowAmountPaidMode(false);
      } else {
        toast.error(result.error || drxCopy.pos.cart.checkoutFailed);
      }
    } catch (e: any) {
      toast.error(e.message || drxCopy.pos.cart.checkoutFailed);
    }
  };

  if (businessLoading) return <SalesSkeleton />;

  if (!business) {
    return <div className="p-4 md:p-8">{drxCopy.pos.missingBusiness}</div>;
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-6 space-y-6 page-transition">
      <div className="noise-overlay" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h1 className="headline-text text-3xl tracking-widest text-muted-foreground">
            {drxCopy.pos.title}
          </h1>
          <p className="technical-label text-xs text-muted-foreground/60 mt-1">
            {drxCopy.pos.subtitlePrefix}{" "}
            {business?.name?.toUpperCase() || "MAIN"} •{" "}
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Column: Inventory & AI */}
        <div className="lg:col-span-8 space-y-6">
          <ProductSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            inventory={inventory}
            onAddToCart={addToCart}
            onWeightEntry={(item) => {
              setSelectedProductForWeight(item);
              setShowWeightEntry(true);
            }}
          />

          <AIPricingWidget
            recommendations={aiRecommendations}
            onApply={handleApplyAIPricingWrapper}
          />
        </div>

        {/* Right Column: Cart */}
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
              <CartCustomer
                selectedCustomer={selectedCustomer}
                customers={customers}
                customerLoyalty={customerLoyalty}
                onSelectClick={() => setShowCustomerSelector(true)}
              />

              <CartItems
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onSetQuantity={setQuantity}
                onRemoveItem={removeFromCart}
                onOverridePrice={(item) => {
                  setSelectedItemForOverride(item);
                  setShowPriceOverride(true);
                }}
                canOverridePrice={canOverridePrice}
              />

              <CartDelivery
                selectedDeliveryId={cart.delivery_management_id}
                deliveryOptions={deliveryOptions}
                deliveryAddress={deliveryAddress}
                deliveryPrice={deliveryPrice}
                onDeliveryChange={handleDeliveryChange}
                onAddressChange={handleAddressChange}
              />

              <CartFees fees={fees} setFees={setFees} />

              <CartTotals
                cart={cart}
                fees={fees}
                taxEnabled={taxEnabledLocal}
                amountPaid={amountPaid}
                setAmountPaid={setAmountPaid}
                showAmountPaidMode={showAmountPaidMode}
                processing={processing}
                onCheckout={() => {
                  if (cart.items.length === 0) {
                    toast.error("Cart is empty");
                    return;
                  }
                  setReviewModalOpen(true);
                }}
              />

              <PaymentSection
                paymentMethod={cart.payment_method}
                onMethodChange={(val) => {
                  posEngine.setPaymentMethod(val);
                }}
                paymentRef={cart.payment_ref}
                onRefChange={(val) => {
                  posEngine.setPaymentRef(val);
                }}
              />

              <AdminActions
                businessId={business.id}
                onShrinkageClick={() => setShowShrinkageForm(true)}
                onInvCheckClick={() => setShowInventoryCheck(true)}
              />
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
        onAddToCart={addWeightedItem}
      />

      <PriceOverrideModal
        open={showPriceOverride}
        onOpenChange={setShowPriceOverride}
        productName={selectedItemForOverride?.product_name || ""}
        currentPrice={selectedItemForOverride?.unit_price || 0}
        onConfirm={(price, reason) =>
          overridePrice(selectedItemForOverride.inventory_id, price, reason)
        }
      />

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
                  customers.find((c) => c.id === selectedCustomer)?.alias ||
                  [
                    customers.find((c) => c.id === selectedCustomer)?.first_name,
                    customers.find((c) => c.id === selectedCustomer)?.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                  "Customer",
                id: selectedCustomer,
              }
            : undefined
        }
        onConfirm={async () => {
          await handleCheckoutWrapper();
          setReviewModalOpen(false);
        }}
      />
    </div>
  );
}
