import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreventScreenCapture } from "expo-screen-capture";
import type { Id } from "@drx-convex/_generated/dataModel";
import { api } from "@drx-convex/_generated/api";
import { useAuth } from "../../src/contexts/AuthContext";
import { useOffline } from "../../src/contexts/OfflineContext";
import {
  getCachedCatalog,
  saveCachedCatalog,
} from "../../src/offline/database";
import {
  effectiveUnitPriceCents,
  formatQuantity,
  minimumSaleQuantity,
  normalizeQuantity,
  pricedLineTotalCents,
  resolveLoyaltyEligibleSpendCents,
  resolveLoyaltyRateBps,
  suggestedQuantityForDollars,
  type FractionalProduct,
  type LoyaltyCombinationPolicy,
  type LoyaltyTier,
} from "../../src/lib/checkoutMath";
import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZES,
  SPACING,
} from "../../src/constants/theme";

type Product = NonNullable<ReturnType<typeof useProducts>>[number];
type Customer = NonNullable<ReturnType<typeof useCustomers>>[number];
type CartLine = { product: Product; quantityGrams: number };
type Tender = "cash" | "card" | "credit";
type PricedProduct = Product & FractionalProduct;
type CheckoutRequest = {
  customerId?: Id<"customers">;
  orderNumber: string;
  items: { productId: Id<"products">; quantityGrams: number }[];
  paymentMethod: Tender;
  amountPaidCents: number;
  delivery?: { address: string; vendorFeeCents: number; chargeCustomer: boolean };
};
type CheckoutResult = { orderNumber: string; totalAmountCents: number; deliveryId?: string };
type CheckoutQuoteRequest = {
  customerId?: Id<"customers">;
  items: { productId: Id<"products">; quantityGrams: number }[];
  delivery?: { vendorFeeCents: number; chargeCustomer: boolean };
};
type CommerceSettings = {
  loyaltyCombinationPolicy?: LoyaltyCombinationPolicy;
  loyaltyTiers?: LoyaltyTier[];
  deliveryFeeTaxable?: boolean;
};
function useProducts() {
  return useQuery(api.products.listProducts);
}
function useCustomers() {
  return useQuery(api.customers.listCustomers);
}
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const pricing = (product: Product) => product as PricedProduct;
const maskCustomerName = (customer: Customer) => {
  const name = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  if (!name) return "Customer";
  return name
    .split(/\s+/)
    .map((part) => `${part[0]?.toUpperCase() ?? "C"}***`)
    .join(" ");
};

export default function POSScreen() {
  usePreventScreenCapture("drx-pos");
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { businessId, userId } = useAuth();
  const liveProducts = useProducts();
  const liveCustomers = useCustomers();
  const [cachedProducts, setCachedProducts] = useState<Product[] | null>(null);
  const [cachedCustomers, setCachedCustomers] = useState<Customer[] | null>(
    null,
  );
  const businessSettings = useQuery(api.settings.getBusinessSettings);
  const convex = useConvex();
  const checkout = useMutation(api.checkout.processCheckout);
  const { isOnline, authorization, queue, queueSale, syncPending } =
    useOffline();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tender, setTender] = useState<Tender>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOrderNumber, setCheckoutOrderNumber] = useState<string | null>(null);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [vendorFee, setVendorFee] = useState("");
  const [chargeDeliveryToCustomer, setChargeDeliveryToCustomer] = useState(true);
  const products = liveProducts ?? cachedProducts;
  const customers = liveCustomers ?? cachedCustomers;
  const pricingForCheckout = useCallback((product: Product): PricedProduct => {
    const configured = pricing(product);
    return isOnline ? configured : { ...configured, bulkPriceTiers: [] };
  }, [isOnline]);
  const commerceSettings = businessSettings?.settings as CommerceSettings | null | undefined;
  const loyaltyEligibleSpendCents = customer
    ? resolveLoyaltyEligibleSpendCents(
        customer as Customer & { loyaltyEligibleSpendCents?: number },
      )
    : 0;
  const loyaltyRateBps = isOnline && customer
    ? resolveLoyaltyRateBps(loyaltyEligibleSpendCents, commerceSettings?.loyaltyTiers ?? [])
    : 0;
  const loyaltyPolicy = commerceSettings?.loyaltyCombinationPolicy ?? "best_only";

  useEffect(() => {
    let active = true;
    if (!businessId || !userId) {
      setCachedProducts(null);
      setCachedCustomers(null);
      return () => {
        active = false;
      };
    }
    void getCachedCatalog(businessId, userId).then((catalog) => {
      if (!active) return;
      setCachedProducts(catalog.products as Product[]);
      setCachedCustomers(catalog.customers as Customer[]);
    });
    return () => {
      active = false;
    };
  }, [businessId, userId]);

  useEffect(() => {
    if (!businessId || !userId || !liveProducts || !liveCustomers) return;
    setCachedProducts(liveProducts);
    setCachedCustomers(liveCustomers);
    void saveCachedCatalog(businessId, userId, liveProducts, liveCustomers);
  }, [businessId, liveCustomers, liveProducts, userId]);
  const subtotalCents = useMemo(
    () =>
      cart.reduce(
        (sum, line) =>
          sum + pricedLineTotalCents(
            pricingForCheckout(line.product),
            line.quantityGrams,
            loyaltyRateBps,
            loyaltyPolicy,
          ),
        0,
      ),
    [cart, loyaltyPolicy, loyaltyRateBps, pricingForCheckout],
  );
  const taxableSubtotalCents = useMemo(
    () =>
      cart.reduce(
        (sum, line) =>
          line.product.isTaxable === false
            ? sum
            : sum + pricedLineTotalCents(
                pricingForCheckout(line.product),
                line.quantityGrams,
                loyaltyRateBps,
                loyaltyPolicy,
              ),
        0,
      ),
    [cart, loyaltyPolicy, loyaltyRateBps, pricingForCheckout],
  );
  const collectTax = isOnline
    ? businessSettings?.business.collectTax
    : authorization?.collectTax;
  const taxRateBps = isOnline
    ? businessSettings?.business.taxRateBps
    : authorization?.taxRateBps;
  const merchandiseTaxCents = collectTax
    ? Math.round((taxableSubtotalCents * (taxRateBps ?? 0)) / 10_000)
    : 0;
  const vendorFeeCents = Math.max(0, Math.round(Number(vendorFee || 0) * 100));
  const deliveryRevenueCents =
    deliveryEnabled && chargeDeliveryToCustomer ? vendorFeeCents : 0;
  const deliveryFeeTaxable =
    commerceSettings?.deliveryFeeTaxable === true;
  const deliveryTaxCents =
    collectTax && deliveryFeeTaxable
      ? Math.round((deliveryRevenueCents * (taxRateBps ?? 0)) / 10_000)
      : 0;
  const taxCents = merchandiseTaxCents + deliveryTaxCents;
  const estimatedTotalCents = subtotalCents + deliveryRevenueCents + taxCents;
  const deliveryDetailsValid = !deliveryEnabled || (
    deliveryAddress.trim().length > 0 &&
    vendorFee.trim().length > 0 &&
    Number.isFinite(Number(vendorFee)) &&
    Number(vendorFee) > 0 &&
    Number.isSafeInteger(vendorFeeCents)
  );
  const quoteArgs = useMemo<CheckoutQuoteRequest>(() => ({
    ...(customer ? { customerId: customer._id } : {}),
    items: cart.map((line) => ({
      productId: line.product._id,
      quantityGrams: line.quantityGrams,
    })),
    ...(deliveryEnabled
      ? { delivery: { vendorFeeCents, chargeCustomer: chargeDeliveryToCustomer } }
      : {}),
  }), [cart, chargeDeliveryToCustomer, customer, deliveryEnabled, vendorFeeCents]);
  const checkoutQuote = useQuery(
    api.checkout.quoteCheckout,
    isOnline && cart.length > 0 && deliveryDetailsValid ? quoteArgs : "skip",
  );
  const displayedTotalCents = isOnline
    ? checkoutQuote?.totalAmountCents ?? estimatedTotalCents
    : estimatedTotalCents;
  const quotePending = isOnline && cart.length > 0 && deliveryDetailsValid && checkoutQuote === undefined;
  const isTablet = width >= 800;

  const addProduct = (product: Product) => {
    if (product.quantityOnHandGrams <= 0)
      return Alert.alert(
        "Out of stock",
        `${product.productName} has no available inventory.`,
      );
    setCheckoutOrderNumber(null);
    setCart((current) => {
      const initialQuantity = Math.min(
        product.quantityOnHandGrams,
        Math.max(minimumSaleQuantity(pricing(product)), 1),
      );
      const increment = minimumSaleQuantity(pricing(product));
      const existing = current.find((line) => line.product._id === product._id);
      if (!existing) return [...current, { product, quantityGrams: initialQuantity }];
      return current.map((line) =>
        line.product._id === product._id
          ? {
              ...line,
              quantityGrams: Math.min(
                product.quantityOnHandGrams,
                line.quantityGrams + increment,
              ),
            }
          : line,
      );
    });
  };
  const updateQuantity = (productId: Id<"products">, raw: string) => {
    setCheckoutOrderNumber(null);
    const quantity = Number(raw);
    setCart((current) =>
      current.flatMap((line) => {
        if (line.product._id !== productId) return [line];
        if (!Number.isFinite(quantity) || quantity <= 0) return [];
        return [
          {
            ...line,
            quantityGrams: normalizeQuantity(
              pricing(line.product),
              quantity,
              line.product.quantityOnHandGrams,
            ),
          },
        ];
      }),
    );
  };
  const updateDollarAmount = (productId: Id<"products">, raw: string) => {
    setCheckoutOrderNumber(null);
    const cents = Math.round(Number(raw) * 100);
    setCart((current) =>
      current.flatMap((line) => {
        if (line.product._id !== productId) return [line];
        const quantity = suggestedQuantityForDollars(
          pricingForCheckout(line.product),
          cents,
          line.product.quantityOnHandGrams,
          loyaltyRateBps,
          loyaltyPolicy,
        );
        return quantity > 0 ? [{ ...line, quantityGrams: quantity }] : [];
      }),
    );
  };
  const setQuantityPreset = (productId: Id<"products">, quantity: number) => {
    updateQuantity(productId, String(quantity));
  };
  const setDollarPreset = (productId: Id<"products">, cents: number) => {
    updateDollarAmount(productId, String(cents / 100));
  };

  const submitSale = async () => {
    if (!businessId || !userId || cart.length === 0) return;
    if (tender === "credit" && !customer)
      return Alert.alert(
        "Customer required",
        "Select an existing customer for a credit sale.",
      );
    if (!isOnline && tender === "card")
      return Alert.alert(
        "Card unavailable offline",
        "Use cash or authorized customer credit until connectivity returns.",
      );
    if (deliveryEnabled && !isOnline)
      return Alert.alert(
        "Delivery requires a connection",
        "Reconnect before creating a delivery so the sale and dispatch record are committed together.",
      );
    if (
      deliveryEnabled &&
      (!deliveryAddress.trim() ||
        !vendorFee.trim() ||
        !Number.isFinite(Number(vendorFee)) ||
        Number(vendorFee) <= 0 ||
        !Number.isSafeInteger(vendorFeeCents))
    )
      return Alert.alert(
        "Delivery details required",
        "Enter the delivery address and the current Uber/vendor quote.",
      );
    setSubmitting(true);
    try {
      const occurredAt = Date.now();
      if (isOnline) {
        const freshQuote = await convex.query(api.checkout.quoteCheckout, quoteArgs);
        const amountPaidCents = tender === "cash"
          ? Math.round(Number(cashReceived || freshQuote.totalAmountCents / 100) * 100)
          : tender === "credit"
            ? 0
            : freshQuote.totalAmountCents;
        if (!Number.isFinite(amountPaidCents)) {
          throw new Error("Enter a valid cash amount.");
        }
        if (tender === "cash" && amountPaidCents < freshQuote.totalAmountCents) {
          throw new Error("Cash received must cover the current server total.");
        }
        const activeOrderNumber =
          checkoutOrderNumber ?? `DRX-A-${occurredAt}`;
        if (!checkoutOrderNumber) {
          setCheckoutOrderNumber(activeOrderNumber);
        }
        const result = await (checkout as unknown as (args: CheckoutRequest) => Promise<CheckoutResult>)({
          customerId: customer?._id,
          orderNumber: activeOrderNumber,
          items: cart.map((line) => ({
            productId: line.product._id,
            quantityGrams: line.quantityGrams,
          })),
          paymentMethod: tender,
          amountPaidCents,
          delivery: deliveryEnabled
            ? {
                address: deliveryAddress.trim(),
                vendorFeeCents,
                chargeCustomer: chargeDeliveryToCustomer,
              }
            : undefined,
        });
        setCheckoutOrderNumber(null);
        Alert.alert(
          "Sale complete",
          `${result.orderNumber} · ${money(result.totalAmountCents)}${result.deliveryId ? " · delivery ready for dispatch" : ""}`,
        );
      } else {
        const amountPaidCents = tender === "cash"
          ? Math.round(Number(cashReceived || estimatedTotalCents / 100) * 100)
          : tender === "credit"
            ? 0
            : estimatedTotalCents;
        if (!Number.isFinite(amountPaidCents)) {
          throw new Error("Enter a valid cash amount.");
        }
        if (tender === "cash" && amountPaidCents < estimatedTotalCents) {
          throw new Error("Cash received must cover the offline preview total.");
        }
        if (!authorization || authorization.expiresAt < occurredAt)
          throw new Error(
            "An active offline authorization is required. Reconnect and refresh it from More.",
          );
        await queueSale({
          authorizationId: authorization.authorizationId,
          businessId,
          userId,
          deviceId: authorization.deviceId,
          idempotencyKey: globalThis.crypto.randomUUID(),
          sequence: occurredAt,
          occurredAt,
          customerId: customer?._id,
          customerCreditAvailableCents: customer
            ? Math.max(
                0,
                customer.creditLimitCents - customer.totalCreditUsedCents,
              )
            : undefined,
          items: cart.map((line) => ({
            productId: line.product._id,
            quantityGrams: line.quantityGrams,
            unitPriceCents: line.product.sellingPriceCents,
          })),
          paymentMethod: tender as "cash" | "credit",
          amountPaidCents,
          totalAmountCents: estimatedTotalCents,
        });
        Alert.alert(
          "Sale safely queued",
          "The receipt will be finalized after Convex reconciliation.",
        );
      }
      setCart([]);
      setCustomer(null);
      setCashReceived("");
      setCheckoutOpen(false);
      setDeliveryEnabled(false);
      setDeliveryAddress("");
      setVendorFee("");
      setChargeDeliveryToCustomer(true);
    } catch (error: unknown) {
      Alert.alert(
        "Checkout stopped",
        error instanceof Error
          ? error.message
          : "The sale could not be preserved.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!products || !customers || (isOnline && businessSettings === undefined))
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );

  const catalog = (
    <View style={styles.catalog}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>OPERATOR CHECKOUT</Text>
          <Text style={styles.title}>Products</Text>
        </View>
        <View
          style={[styles.connection, !isOnline && styles.connectionOffline]}
        >
          <Text
            style={[
              styles.connectionText,
              !isOnline && styles.connectionTextOffline,
            ]}
          >
            {isOnline ? "ONLINE" : `OFFLINE · ${queue.pending} QUEUED`}
          </Text>
        </View>
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={isTablet ? 3 : 2}
        key={isTablet ? "tablet" : "phone"}
        contentContainerStyle={styles.productGrid}
        columnWrapperStyle={styles.productRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => addProduct(item)}
          >
            <Text style={styles.productName} numberOfLines={2}>
              {item.productName}
            </Text>
            <Text style={styles.productMeta}>
              {item.sku} · {item.quantityOnHandGrams.toFixed(1)}g
            </Text>
            <Text style={styles.productPrice}>
              {money(item.sellingPriceCents)}/{pricing(item).sellingUnit ?? "g"}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const basket = (
    <View style={[styles.basket, isTablet && styles.basketTablet]}>
      <Text style={styles.title}>Current sale</Text>
      <ScrollView
        style={styles.lines}
        contentInsetAdjustmentBehavior="automatic"
      >
        {cart.length === 0 ? (
          <Text style={styles.empty}>Tap a product to begin.</Text>
        ) : (
          cart.map((line) => (
            <View key={line.product._id} style={styles.line}>
              <View style={styles.lineContent}>
                <View style={styles.lineHeading}>
                  <View style={styles.lineInfo}>
                    <Text style={styles.lineName}>{line.product.productName}</Text>
                    <Text style={styles.linePrice}>
                      {money(
                        checkoutQuote?.lines.find(
                          (quotedLine: { productId: string }) => quotedLine.productId === line.product._id,
                        )?.lineSubtotalCents ?? pricedLineTotalCents(
                          pricingForCheckout(line.product),
                          line.quantityGrams,
                          loyaltyRateBps,
                          loyaltyPolicy,
                        ),
                      )}
                      {effectiveUnitPriceCents(pricingForCheckout(line.product), line.quantityGrams) !==
                      line.product.sellingPriceCents
                        ? ` · bulk ${money(effectiveUnitPriceCents(pricingForCheckout(line.product), line.quantityGrams))}/${pricing(line.product).sellingUnit ?? "g"}`
                        : ""}
                    </Text>
                  </View>
                  <Text style={styles.quantitySummary}>
                    {formatQuantity(pricing(line.product), line.quantityGrams)}
                  </Text>
                </View>
                <View style={styles.entryRow}>
                  <View style={styles.entryField}>
                    <Text style={styles.entryLabel}>QUANTITY</Text>
                    <TextInput
                      style={styles.quantity}
                      value={String(line.quantityGrams)}
                      onChangeText={(value) => updateQuantity(line.product._id, value)}
                      keyboardType="decimal-pad"
                      accessibilityLabel={`${line.product.productName} quantity in ${pricing(line.product).sellingUnit ?? "grams"}`}
                    />
                  </View>
                  <View style={styles.entryField}>
                    <Text style={styles.entryLabel}>DOLLARS</Text>
                    <TextInput
                      key={`${line.product._id}-${line.quantityGrams}`}
                      style={styles.quantity}
                      defaultValue={(pricedLineTotalCents(
                        pricingForCheckout(line.product),
                        line.quantityGrams,
                        loyaltyRateBps,
                        loyaltyPolicy,
                      ) / 100).toFixed(2)}
                      onEndEditing={(event) =>
                        updateDollarAmount(line.product._id, event.nativeEvent.text)
                      }
                      keyboardType="decimal-pad"
                      accessibilityLabel={`${line.product.productName} dollar amount`}
                    />
                  </View>
                </View>
                {(pricing(line.product).suggestedQuantityPresets?.length ?? 0) > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                    {pricing(line.product).suggestedQuantityPresets?.map((quantity: number) => (
                      <TouchableOpacity key={`q-${quantity}`} style={styles.preset} onPress={() => setQuantityPreset(line.product._id, quantity)}>
                        <Text style={styles.presetText}>{formatQuantity(pricing(line.product), quantity)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
                {(pricing(line.product).suggestedDollarPresetsCents?.length ?? 0) > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                    {pricing(line.product).suggestedDollarPresetsCents?.map((cents: number) => (
                      <TouchableOpacity key={`d-${cents}`} style={styles.preset} onPress={() => setDollarPreset(line.product._id, cents)}>
                        <Text style={styles.presetText}>{money(cents)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <TouchableOpacity
        style={styles.customerButton}
        onPress={() => setCheckoutOpen(true)}
      >
        <Text style={styles.customerButtonText}>
          {customer
            ? maskCustomerName(customer)
            : "Select customer or checkout"}
        </Text>
      </TouchableOpacity>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{isOnline && !checkoutQuote ? "Preview" : "Total"}</Text>
        <Text style={styles.total}>{money(displayedTotalCents)}</Text>
      </View>
      {quotePending ? <Text style={styles.quoteStatus}>Calculating server total…</Text> : null}
      <TouchableOpacity
        style={[styles.checkout, cart.length === 0 && styles.disabled]}
        disabled={cart.length === 0}
        onPress={() => setCheckoutOpen(true)}
      >
        <Text style={styles.checkoutText}>CHECKOUT</Text>
      </TouchableOpacity>
      {isOnline && queue.pending > 0 ? (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={() => void syncPending()}
        >
          <Text style={styles.syncText}>
            Sync {queue.pending} queued sale(s)
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={[styles.workspace, isTablet && styles.workspaceTablet]}>
        {catalog}
        {basket}
      </View>
      <Modal
        visible={checkoutOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckoutOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalCard}
            contentContainerStyle={styles.modalContent}
            contentInsetAdjustmentBehavior="automatic"
          >
            <Text style={styles.title}>
              Tender · {money(displayedTotalCents)}
            </Text>
            {isOnline ? (
              checkoutQuote ? (
                <Text style={styles.quoteVerified}>
                  SERVER VERIFIED · {money(checkoutQuote.merchandiseSubtotalCents)} merchandise
                  {checkoutQuote.discountCents > 0 ? ` · −${money(checkoutQuote.discountCents)} discounts` : ""}
                  {checkoutQuote.taxAmountCents > 0 ? ` · ${money(checkoutQuote.taxAmountCents)} tax` : ""}
                </Text>
              ) : (
                <Text style={styles.quoteStatus}>Preview only · calculating server total…</Text>
              )
            ) : null}
            <Text style={styles.modalLabel}>Customer</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <TouchableOpacity
                style={[styles.chip, !customer && styles.chipActive]}
                onPress={() => setCustomer(null)}
              >
                <Text style={styles.chipText}>Walk-in</Text>
              </TouchableOpacity>
              {customers.map((item: Customer) => (
                <TouchableOpacity
                  key={item._id}
                  style={[
                    styles.chip,
                    customer?._id === item._id && styles.chipActive,
                  ]}
                  onPress={() => setCustomer(item)}
                >
                  <Text style={styles.chipText}>{maskCustomerName(item)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Payment</Text>
            {customer ? (
              <Text style={styles.loyaltyNotice}>
                {customer.loyaltyTier.toUpperCase()} loyalty
                {loyaltyRateBps > 0
                  ? ` · ${(loyaltyRateBps / 100).toFixed(2)}% ${loyaltyPolicy === "stack" ? "stacks after" : "compared with"} bulk pricing`
                  : " · no checkout discount"}
              </Text>
            ) : null}
            <View style={styles.deliveryToggleRow}>
              <View style={styles.deliveryToggleCopy}>
                <Text style={styles.modalLabel}>Include delivery</Text>
                <Text style={styles.deliveryHint}>
                  Creates the dispatch task with this completed sale.
                </Text>
              </View>
              <Switch
                value={deliveryEnabled}
                onValueChange={setDeliveryEnabled}
                disabled={!isOnline}
                trackColor={{ true: COLORS.accent }}
                accessibilityLabel="Include delivery"
              />
            </View>
            {deliveryEnabled ? (
              <View style={styles.deliveryFields}>
                <TextInput
                  style={styles.deliveryInput}
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Delivery address"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  textContentType="fullStreetAddress"
                />
                <TextInput
                  style={styles.deliveryInput}
                  value={vendorFee}
                  onChangeText={setVendorFee}
                  placeholder="Uber/vendor quote"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
                <View style={styles.allocationRow}>
                  <TouchableOpacity
                    style={[styles.allocationButton, chargeDeliveryToCustomer && styles.allocationActive]}
                    onPress={() => setChargeDeliveryToCustomer(true)}
                  >
                    <Text style={styles.allocationText}>CHARGE CUSTOMER</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.allocationButton, !chargeDeliveryToCustomer && styles.allocationActive]}
                    onPress={() => setChargeDeliveryToCustomer(false)}
                  >
                    <Text style={styles.allocationText}>MERCHANT ABSORBS</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.deliveryHint}>
                  {chargeDeliveryToCustomer
                    ? `${money((checkoutQuote?.deliveryRevenueCents ?? deliveryRevenueCents) + (checkoutQuote?.deliveryTaxCents ?? deliveryTaxCents))} is added to the customer total.`
                    : `${money(vendorFeeCents)} remains a vendor expense and does not reduce merchandise revenue.`}
                </Text>
              </View>
            ) : null}
            <View style={styles.tenders}>
              {(["cash", "card", "credit"] as Tender[]).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.tender,
                    tender === method && styles.tenderActive,
                    !isOnline && method === "card" && styles.disabled,
                  ]}
                  disabled={!isOnline && method === "card"}
                  onPress={() => setTender(method)}
                >
                  <Text style={styles.tenderText}>{method.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tender === "cash" ? (
              <TextInput
                style={styles.cashInput}
                value={cashReceived}
                onChangeText={setCashReceived}
                keyboardType="decimal-pad"
                placeholder="Cash received"
                placeholderTextColor={COLORS.textMuted}
              />
            ) : null}
            {!isOnline ? (
              <Text style={styles.offlineNotice}>
                Offline sales use the owner-approved limits stored on this
                device. Bulk and loyalty discounts require live server pricing;
                base catalog prices are used offline. Conflicts are preserved
                for reconciliation.
              </Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.checkout,
                (submitting || !deliveryDetailsValid || (isOnline && !checkoutQuote)) && styles.disabled,
              ]}
              onPress={submitSale}
              disabled={submitting || !deliveryDetailsValid || (isOnline && !checkoutQuote)}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.checkoutText}>
                  {isOnline ? "COMPLETE SALE" : "QUEUE OFFLINE SALE"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancel}
              onPress={() => setCheckoutOpen(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  workspace: { flex: 1 },
  workspaceTablet: { flexDirection: "row" },
  catalog: { flex: 1, padding: SPACING.md },
  basket: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderTopWidth: 1,
    maxHeight: "48%",
    padding: SPACING.md,
  },
  basketTablet: {
    borderLeftWidth: 1,
    borderTopWidth: 0,
    maxHeight: "100%",
    width: 360,
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xs,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xxl, fontWeight: "700" },
  connection: {
    backgroundColor: COLORS.success + "22",
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  connectionOffline: { backgroundColor: COLORS.warning + "22" },
  connectionText: {
    color: COLORS.success,
    fontSize: FONT_SIZES.xs,
    fontWeight: "800",
  },
  connectionTextOffline: { color: COLORS.warning },
  productGrid: { paddingVertical: SPACING.md, paddingBottom: 120 },
  productRow: { gap: SPACING.sm },
  productCard: {
    flex: 1,
    minHeight: 126,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  productName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  productMeta: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  productPrice: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
  },
  lines: { maxHeight: 180, marginVertical: SPACING.sm },
  empty: {
    color: COLORS.textMuted,
    paddingVertical: SPACING.lg,
    textAlign: "center",
  },
  line: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingVertical: SPACING.sm,
  },
  lineContent: { flex: 1, gap: SPACING.xs },
  lineHeading: { alignItems: "center", flexDirection: "row", gap: SPACING.sm },
  lineInfo: { flex: 1 },
  lineName: { color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: "600" },
  linePrice: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  quantitySummary: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.sm,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  entryRow: { flexDirection: "row", gap: SPACING.sm },
  entryField: { flex: 1, gap: 3 },
  entryLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  quantity: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text,
    minWidth: 64,
    padding: SPACING.sm,
    textAlign: "right",
  },
  presetRow: { gap: SPACING.xs, paddingTop: SPACING.xs },
  preset: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  presetText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  customerButton: { paddingVertical: SPACING.sm },
  customerButtonText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  totalLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md },
  total: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "800" },
  quoteStatus: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.sm,
  },
  quoteVerified: {
    color: COLORS.success,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  checkout: {
    alignItems: "center",
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  checkoutText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: "900",
  },
  disabled: { opacity: 0.35 },
  syncButton: { alignItems: "center", paddingTop: SPACING.sm },
  syncText: { color: COLORS.accent, fontSize: FONT_SIZES.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: "92%",
  },
  modalContent: { padding: SPACING.lg, paddingBottom: 36 },
  modalLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  loyaltyNotice: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  deliveryToggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  deliveryToggleCopy: { flex: 1 },
  deliveryFields: { gap: SPACING.sm, marginBottom: SPACING.md },
  deliveryInput: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    color: COLORS.text,
    minHeight: 48,
    padding: SPACING.md,
  },
  allocationRow: { flexDirection: "row", gap: SPACING.sm },
  allocationButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flex: 1,
    padding: SPACING.sm,
  },
  allocationActive: { borderColor: COLORS.accent },
  allocationText: { color: COLORS.text, fontSize: 10, fontWeight: "800" },
  deliveryHint: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, lineHeight: 18 },
  chips: { gap: SPACING.sm },
  chip: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  chipActive: { borderColor: COLORS.accent },
  chipText: { color: COLORS.text, fontSize: FONT_SIZES.sm },
  tenders: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  tender: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
  },
  tenderActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + "18",
  },
  tenderText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
  },
  cashInput: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  offlineNotice: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  cancel: { alignItems: "center", paddingTop: SPACING.md },
  cancelText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
});
