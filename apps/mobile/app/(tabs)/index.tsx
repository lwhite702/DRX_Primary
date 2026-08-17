import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreventScreenCapture } from "expo-screen-capture";
import type { Id } from "@drx-convex/_generated/dataModel";
import { api } from "@drx-convex/_generated/api";
import { useAuth } from "../../src/contexts/AuthContext";
import { useOffline } from "../../src/contexts/OfflineContext";
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from "../../src/constants/theme";

type Product = NonNullable<ReturnType<typeof useProducts>>[number];
type Customer = NonNullable<ReturnType<typeof useCustomers>>[number];
type CartLine = { product: Product; quantityGrams: number };
type Tender = "cash" | "card" | "credit";
function useProducts() { return useQuery(api.products.listProducts); }
function useCustomers() { return useQuery(api.customers.listCustomers); }
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function POSScreen() {
  usePreventScreenCapture("drx-pos");
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { businessId, userId } = useAuth();
  const products = useProducts();
  const customers = useCustomers();
  const businessSettings = useQuery(api.settings.getBusinessSettings);
  const checkout = useMutation(api.checkout.processCheckout);
  const { isOnline, authorization, queue, queueSale, syncPending } = useOffline();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tender, setTender] = useState<Tender>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const subtotalCents = useMemo(() => cart.reduce((sum, line) => sum + Math.round(line.quantityGrams * line.product.sellingPriceCents), 0), [cart]);
  const collectTax = isOnline ? businessSettings?.business.collectTax : authorization?.collectTax;
  const taxRateBps = isOnline ? businessSettings?.business.taxRateBps : authorization?.taxRateBps;
  const taxCents = collectTax ? Math.round((subtotalCents * (taxRateBps ?? 0)) / 10_000) : 0;
  const estimatedTotalCents = subtotalCents + taxCents;
  const isTablet = width >= 800;

  const addProduct = (product: Product) => {
    if (product.quantityOnHandGrams <= 0) return Alert.alert("Out of stock", `${product.productName} has no available inventory.`);
    setCart((current) => {
      const existing = current.find((line) => line.product._id === product._id);
      if (!existing) return [...current, { product, quantityGrams: 1 }];
      return current.map((line) => line.product._id === product._id ? { ...line, quantityGrams: Math.min(product.quantityOnHandGrams, line.quantityGrams + 1) } : line);
    });
  };
  const updateQuantity = (productId: Id<"products">, raw: string) => {
    const quantity = Number(raw);
    setCart((current) => current.flatMap((line) => {
      if (line.product._id !== productId) return [line];
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      return [{ ...line, quantityGrams: Math.min(line.product.quantityOnHandGrams, quantity) }];
    }));
  };

  const submitSale = async () => {
    if (!businessId || !userId || cart.length === 0) return;
    if (tender === "credit" && !customer) return Alert.alert("Customer required", "Select an existing customer for a credit sale.");
    if (!isOnline && tender === "card") return Alert.alert("Card unavailable offline", "Use cash or authorized customer credit until connectivity returns.");
    setSubmitting(true);
    try {
      const occurredAt = Date.now();
      const amountPaidCents = tender === "cash" ? Math.round(Number(cashReceived || estimatedTotalCents / 100) * 100) : estimatedTotalCents;
      if (isOnline) {
        const result = await checkout({
          customerId: customer?._id,
          orderNumber: `DRX-A-${occurredAt}`,
          items: cart.map((line) => ({ productId: line.product._id, quantityGrams: line.quantityGrams })),
          paymentMethod: tender,
          amountPaidCents,
        });
        Alert.alert("Sale complete", `${result.orderNumber} · ${money(result.totalAmountCents)}`);
      } else {
        if (!authorization || authorization.expiresAt < occurredAt) throw new Error("An active offline authorization is required. Reconnect and refresh it from More.");
        await queueSale({
          authorizationId: authorization.authorizationId, businessId, userId, deviceId: authorization.deviceId,
          idempotencyKey: globalThis.crypto.randomUUID(), sequence: occurredAt, occurredAt,
          customerId: customer?._id,
          customerCreditAvailableCents: customer ? Math.max(0, customer.creditLimitCents - customer.totalCreditUsedCents) : undefined,
          items: cart.map((line) => ({ productId: line.product._id, quantityGrams: line.quantityGrams, unitPriceCents: line.product.sellingPriceCents })),
          paymentMethod: tender as "cash" | "credit", amountPaidCents, totalAmountCents: estimatedTotalCents,
        });
        Alert.alert("Sale safely queued", "The receipt will be finalized after Convex reconciliation.");
      }
      setCart([]); setCustomer(null); setCashReceived(""); setCheckoutOpen(false);
    } catch (error: any) {
      Alert.alert("Checkout stopped", error.message ?? "The sale could not be preserved.");
    } finally { setSubmitting(false); }
  };

  if (products === undefined || customers === undefined || businessSettings === undefined) return <View style={styles.loading}><ActivityIndicator color={COLORS.accent} size="large" /></View>;

  const catalog = <View style={styles.catalog}>
    <View style={styles.headingRow}><View><Text style={styles.eyebrow}>OPERATOR CHECKOUT</Text><Text style={styles.title}>Products</Text></View>
      <View style={[styles.connection, !isOnline && styles.connectionOffline]}><Text style={[styles.connectionText, !isOnline && styles.connectionTextOffline]}>{isOnline ? "ONLINE" : `OFFLINE · ${queue.pending} QUEUED`}</Text></View>
    </View>
    <FlatList data={products} keyExtractor={(item) => item._id} numColumns={isTablet ? 3 : 2} key={isTablet ? "tablet" : "phone"} contentContainerStyle={styles.productGrid} columnWrapperStyle={styles.productRow}
      renderItem={({ item }) => <TouchableOpacity style={styles.productCard} onPress={() => addProduct(item)}><Text style={styles.productName} numberOfLines={2}>{item.productName}</Text><Text style={styles.productMeta}>{item.sku} · {item.quantityOnHandGrams.toFixed(1)}g</Text><Text style={styles.productPrice}>{money(item.sellingPriceCents)}/g</Text></TouchableOpacity>} />
  </View>;

  const basket = <View style={[styles.basket, isTablet && styles.basketTablet]}><Text style={styles.title}>Current sale</Text>
    <ScrollView style={styles.lines} contentInsetAdjustmentBehavior="automatic">{cart.length === 0 ? <Text style={styles.empty}>Tap a product to begin.</Text> : cart.map((line) => <View key={line.product._id} style={styles.line}><View style={styles.lineInfo}><Text style={styles.lineName}>{line.product.productName}</Text><Text style={styles.linePrice}>{money(Math.round(line.quantityGrams * line.product.sellingPriceCents))}</Text></View><TextInput style={styles.quantity} value={String(line.quantityGrams)} onChangeText={(value) => updateQuantity(line.product._id, value)} keyboardType="decimal-pad" accessibilityLabel={`${line.product.productName} quantity in grams`} /><Text style={styles.grams}>g</Text></View>)}</ScrollView>
    <TouchableOpacity style={styles.customerButton} onPress={() => setCheckoutOpen(true)}><Text style={styles.customerButtonText}>{customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() : "Select customer or checkout"}</Text></TouchableOpacity>
    <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{money(estimatedTotalCents)}</Text></View>
    <TouchableOpacity style={[styles.checkout, cart.length === 0 && styles.disabled]} disabled={cart.length === 0} onPress={() => setCheckoutOpen(true)}><Text style={styles.checkoutText}>CHECKOUT</Text></TouchableOpacity>
    {isOnline && queue.pending > 0 ? <TouchableOpacity style={styles.syncButton} onPress={() => void syncPending()}><Text style={styles.syncText}>Sync {queue.pending} queued sale(s)</Text></TouchableOpacity> : null}
  </View>;

  return <View style={[styles.screen, { paddingTop: insets.top }]}><View style={[styles.workspace, isTablet && styles.workspaceTablet]}>{catalog}{basket}</View>
    <Modal visible={checkoutOpen} transparent animationType="slide" onRequestClose={() => setCheckoutOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.title}>Tender · {money(estimatedTotalCents)}</Text>
      <Text style={styles.modalLabel}>Customer</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><TouchableOpacity style={[styles.chip, !customer && styles.chipActive]} onPress={() => setCustomer(null)}><Text style={styles.chipText}>Walk-in</Text></TouchableOpacity>{customers.map((item) => <TouchableOpacity key={item._id} style={[styles.chip, customer?._id === item._id && styles.chipActive]} onPress={() => setCustomer(item)}><Text style={styles.chipText}>{`${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "Customer"}</Text></TouchableOpacity>)}</ScrollView>
      <Text style={styles.modalLabel}>Payment</Text><View style={styles.tenders}>{(["cash", "card", "credit"] as Tender[]).map((method) => <TouchableOpacity key={method} style={[styles.tender, tender === method && styles.tenderActive, !isOnline && method === "card" && styles.disabled]} disabled={!isOnline && method === "card"} onPress={() => setTender(method)}><Text style={styles.tenderText}>{method.toUpperCase()}</Text></TouchableOpacity>)}</View>
      {tender === "cash" ? <TextInput style={styles.cashInput} value={cashReceived} onChangeText={setCashReceived} keyboardType="decimal-pad" placeholder="Cash received" placeholderTextColor={COLORS.textMuted} /> : null}
      {!isOnline ? <Text style={styles.offlineNotice}>Offline sales use the owner-approved limits stored on this device. Conflicts are preserved for reconciliation.</Text> : null}
      <TouchableOpacity style={styles.checkout} onPress={submitSale} disabled={submitting}>{submitting ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.checkoutText}>{isOnline ? "COMPLETE SALE" : "QUEUE OFFLINE SALE"}</Text>}</TouchableOpacity><TouchableOpacity style={styles.cancel} onPress={() => setCheckoutOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
    </View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:COLORS.background},loading:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:COLORS.background},workspace:{flex:1},workspaceTablet:{flexDirection:"row"},catalog:{flex:1,padding:SPACING.md},basket:{backgroundColor:COLORS.surface,borderColor:COLORS.border,borderTopWidth:1,maxHeight:"48%",padding:SPACING.md},basketTablet:{borderLeftWidth:1,borderTopWidth:0,maxHeight:"100%",width:360},headingRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},eyebrow:{color:COLORS.accent,fontSize:FONT_SIZES.xs,fontWeight:"800",letterSpacing:1.2},title:{color:COLORS.text,fontSize:FONT_SIZES.xxl,fontWeight:"700"},connection:{backgroundColor:COLORS.success+"22",borderRadius:BORDER_RADIUS.full,paddingHorizontal:SPACING.sm,paddingVertical:SPACING.xs},connectionOffline:{backgroundColor:COLORS.warning+"22"},connectionText:{color:COLORS.success,fontSize:FONT_SIZES.xs,fontWeight:"800"},connectionTextOffline:{color:COLORS.warning},productGrid:{paddingVertical:SPACING.md,paddingBottom:120},productRow:{gap:SPACING.sm},productCard:{flex:1,minHeight:126,backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,borderRadius:BORDER_RADIUS.lg,justifyContent:"space-between",marginBottom:SPACING.sm,padding:SPACING.md},productName:{color:COLORS.text,fontSize:FONT_SIZES.md,fontWeight:"700"},productMeta:{color:COLORS.textMuted,fontSize:FONT_SIZES.xs},productPrice:{color:COLORS.accent,fontSize:FONT_SIZES.lg,fontWeight:"800"},lines:{maxHeight:180,marginVertical:SPACING.sm},empty:{color:COLORS.textMuted,paddingVertical:SPACING.lg,textAlign:"center"},line:{alignItems:"center",borderBottomColor:COLORS.border,borderBottomWidth:1,flexDirection:"row",paddingVertical:SPACING.sm},lineInfo:{flex:1},lineName:{color:COLORS.text,fontSize:FONT_SIZES.sm,fontWeight:"600"},linePrice:{color:COLORS.textSecondary,fontSize:FONT_SIZES.xs},quantity:{backgroundColor:COLORS.surfaceLight,borderRadius:BORDER_RADIUS.sm,color:COLORS.text,minWidth:64,padding:SPACING.sm,textAlign:"right"},grams:{color:COLORS.textMuted,marginLeft:SPACING.xs},customerButton:{paddingVertical:SPACING.sm},customerButtonText:{color:COLORS.accent,fontSize:FONT_SIZES.sm,fontWeight:"600"},totalRow:{flexDirection:"row",justifyContent:"space-between",marginBottom:SPACING.sm},totalLabel:{color:COLORS.textSecondary,fontSize:FONT_SIZES.md},total:{color:COLORS.text,fontSize:FONT_SIZES.xl,fontWeight:"800"},checkout:{alignItems:"center",backgroundColor:COLORS.accent,borderRadius:BORDER_RADIUS.md,padding:SPACING.md},checkoutText:{color:COLORS.background,fontSize:FONT_SIZES.md,fontWeight:"900"},disabled:{opacity:.35},syncButton:{alignItems:"center",paddingTop:SPACING.sm},syncText:{color:COLORS.accent,fontSize:FONT_SIZES.sm},modalBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.72)",justifyContent:"flex-end"},modalCard:{backgroundColor:COLORS.surface,borderTopLeftRadius:BORDER_RADIUS.xl,borderTopRightRadius:BORDER_RADIUS.xl,padding:SPACING.lg,paddingBottom:36},modalLabel:{color:COLORS.textSecondary,fontSize:FONT_SIZES.sm,marginTop:SPACING.lg,marginBottom:SPACING.sm},chips:{gap:SPACING.sm},chip:{backgroundColor:COLORS.surfaceLight,borderColor:COLORS.border,borderWidth:1,borderRadius:BORDER_RADIUS.full,paddingHorizontal:SPACING.md,paddingVertical:SPACING.sm},chipActive:{borderColor:COLORS.accent},chipText:{color:COLORS.text,fontSize:FONT_SIZES.sm},tenders:{flexDirection:"row",gap:SPACING.sm,marginBottom:SPACING.md},tender:{flex:1,alignItems:"center",backgroundColor:COLORS.surfaceLight,borderColor:COLORS.border,borderWidth:1,borderRadius:BORDER_RADIUS.md,paddingVertical:SPACING.md},tenderActive:{borderColor:COLORS.accent,backgroundColor:COLORS.accent+"18"},tenderText:{color:COLORS.text,fontSize:FONT_SIZES.sm,fontWeight:"800"},cashInput:{backgroundColor:COLORS.surfaceLight,borderColor:COLORS.border,borderWidth:1,borderRadius:BORDER_RADIUS.md,color:COLORS.text,marginBottom:SPACING.md,padding:SPACING.md},offlineNotice:{color:COLORS.warning,fontSize:FONT_SIZES.xs,lineHeight:18,marginBottom:SPACING.md},cancel:{alignItems:"center",paddingTop:SPACING.md},cancelText:{color:COLORS.textSecondary,fontSize:FONT_SIZES.sm}
});
