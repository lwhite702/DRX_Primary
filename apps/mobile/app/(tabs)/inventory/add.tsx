import MotionTouchableOpacity from "../../../src/components/MotionTouchableOpacity";
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Platform, Alert, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "convex/react";
import { api } from "@drx-convex/_generated/api";
import { FractionalProductFields } from "../../../src/components/fractional-product-fields";
import {
  commerceIssue,
  creationCommerceDefaults,
  newProductCommerceSchema,
} from "../../../../app/lib/commerce/product-creation";
import { calculatePurchaseUnitCost } from "../../../../app/lib/commerce/purchase-cost";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from "../../../src/constants/theme";

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createProduct = useMutation(api.products.createProduct);
  const [commerce, setCommerce] = useState(() => creationCommerceDefaults("g"));
  const [saving, setSaving] = useState(false);

  // Form State
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [manualSku, setManualSku] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("Flower"); // Default
  const [unitOfMeasure, setUnitOfMeasure] = useState<"g" | "unit">("g");
  const [description] = useState("");

  // Inventory State
  const [stockQuantity, setStockQuantity] = useState("");
  const [minStock] = useState("10");

  // Pricing State
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState(""); // Base price
  const [usePurchaseBasis, setUsePurchaseBasis] = useState(false);
  const [purchaseCost, setPurchaseCost] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("1");
  const [purchaseUnit, setPurchaseUnit] = useState<"oz" | "g" | "lb" | "unit">("oz");
  const [actualNet, setActualNet] = useState("");

  let purchasePreview: ReturnType<typeof calculatePurchaseUnitCost> | undefined;
  if (usePurchaseBasis && purchaseCost && purchaseQuantity) {
    try {
      purchasePreview = calculatePurchaseUnitCost({
        costCents: Math.round(Number(purchaseCost) * 100),
        quantity: Number(purchaseQuantity), unit: purchaseUnit,
        actualSellingQuantity: actualNet ? Number(actualNet) : undefined,
      }, unitOfMeasure);
    } catch { /* Show a validation message when saving. */ }
  }

  // Helpers for tooltips/info alerts on mobile
  const showHelp = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: "Got it" }]);
  };

  const renderLabel = (
    text: string,
    required = false,
    helpTitle?: string,
    helpText?: string,
  ) => (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
    >
      <Text style={styles.label}>
        {text}
        {required ? " *" : ""}
      </Text>
      {helpTitle && helpText && (
        <MotionTouchableOpacity
          onPress={() => showHelp(helpTitle, helpText)}
          style={{ paddingHorizontal: 6, paddingVertical: 2 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={COLORS.textSecondary}
          />
        </MotionTouchableOpacity>
      )}
    </View>
  );

  // Dynamic profit calculations
  const parsedCost = purchasePreview ? purchasePreview.unitCostCentsExact / 100 : parseFloat(costPrice) || 0;
  const parsedPrice = parseFloat(sellingPrice) || 0;
  const calculatedProfit = parsedPrice - parsedCost;
  const calculatedMargin =
    parsedPrice > 0 ? (calculatedProfit / parsedPrice) * 100 : 0;
  const calculatedMarkup =
    parsedCost > 0 ? (calculatedProfit / parsedCost) * 100 : 0;

  const handleSave = async () => {
    if (!productName.trim() || (manualSku && !sku.trim()) || !sellingPrice || (!usePurchaseBasis && !costPrice)) {
      Alert.alert(
        "Error",
        "Enter a product name, selling price, and cost. Enter a SKU if you chose your own.",
      );
      return;
    }

    setSaving(true);
    try {
      const parsed = newProductCommerceSchema.safeParse({
        ...commerce,
        sellingUnit: unitOfMeasure,
      });
      if (!parsed.success)
        throw new Error(
          parsed.error.issues[0]?.message || "Check the selling rules",
        );
      const price = Number(sellingPrice),
        cost = usePurchaseBasis ? 0 : Number(costPrice);
      if (usePurchaseBasis && !purchasePreview) throw new Error("Check the purchase price, package quantity, and units");
      if (usePurchaseBasis && Math.abs(Number(purchaseCost) * 100 - Math.round(Number(purchaseCost) * 100)) > 1e-6) {
        throw new Error("Purchase price must use at most two decimal places");
      }
      if (
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isFinite(cost) ||
        cost < 0 ||
        [price, cost].some(
          (amount) => Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6,
        )
      )
        throw new Error("Enter valid prices with at most two decimal places");
      const tierIssue = commerceIssue(parsed.data, price);
      if (tierIssue) throw new Error(tierIssue);
      const {
        fractionalEnabled,
        sellingUnit,
        decimalPrecision,
        minimumSaleQuantity,
        quantityIncrement,
        suggestedDollarAmounts,
        suggestedQuantities,
        bulkPriceTiers,
      } = parsed.data;
      const commerceConfig = {
        sellingUnit,
        decimalPrecision,
        minimumSaleQuantity,
        quantityIncrement,
        suggestedDollarAmounts,
        suggestedQuantities,
        bulkPriceTiers: bulkPriceTiers.map(tier => ({ minimumQuantity: tier.minimumQuantity, unitPriceCents: tier.totalPrice === undefined ? Math.round(tier.unitPrice * 100) : Math.max(1, Math.round(tier.totalPrice * 100 / tier.minimumQuantity)), ...(tier.totalPrice === undefined ? {} : { bundlePriceCents: Math.round(tier.totalPrice * 100) }) })),
      };
      await createProduct({
        sku: manualSku ? sku.trim() : "",
        barcode: barcode.trim() || undefined,
        productName: productName.trim(),
        category,
        description: description || undefined,
        sellingPriceCents: Math.round(price * 100),
        unitCostCents: Math.round(cost * 100),
        purchaseCostBasis: usePurchaseBasis ? {
          costCents: Math.round(Number(purchaseCost) * 100),
          quantity: Number(purchaseQuantity), unit: purchaseUnit,
          actualSellingQuantity: actualNet ? Number(actualNet) : undefined,
        } : undefined,
        reorderLevelGrams: Number(minStock),
        allowFractionalWeight: fractionalEnabled,
        commerceConfig,
        initialQuantity: Number(stockQuantity || "0"),
      });

      Alert.alert("Product added", "Your stock list is up to date.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  const suggestPricing = () => {
    // Basic AI/Heuristic placeholder
    if (!costPrice) {
      Alert.alert("Info", "Enter cost price first to get a suggestion.");
      return;
    }
    const cost = parseFloat(costPrice);
    if (isNaN(cost)) return;

    // Suggest 3x meetup markup
    const suggestedPrice = (cost * 3).toFixed(2);
    setSellingPrice(suggestedPrice);

    Alert.alert("AI Suggestion", "Applied a suggested base price. Open Advanced: bulk and bundle prices to set quantity totals.");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <MotionTouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </MotionTouchableOpacity>
        <Text style={styles.title}>Add New Product</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          {/* Web Onboarding Recommendation Tip */}
          <View
            accessible={true}
            accessibilityLabel="First product help. Use DRX on the web for guided setup."
            style={{
              backgroundColor: "rgba(139, 92, 246, 0.08)",
              padding: SPACING.md,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: "rgba(139, 92, 246, 0.2)",
              marginBottom: SPACING.md,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Ionicons name="desktop-outline" size={20} color="#8B5CF6" />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 13,
                  fontWeight: "600",
                  marginBottom: 2,
                }}
              >
                First Time Setup?
              </Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 11,
                  lineHeight: 15,
                }}
              >
                For a step-by-step guided onboarding experience to configure
                your first product, we recommend using the web dashboard.
              </Text>
            </View>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Details</Text>

            {renderLabel(
              "Product Name",
              true,
              "Product Name",
              "The name displayed on customer menus, receipts, and order screens.",
            )}
            <TextInput
              style={styles.input}
              placeholder="e.g. Blue Dream"
              value={productName}
              onChangeText={setProductName}
              placeholderTextColor={COLORS.textMuted}
            />

            {renderLabel(
              "Category",
              false,
              "Category",
              "Categorizing products makes them easier to find and automatically assigns correct measuring units.",
            )}
            <View style={styles.categoryRow}>
              {[
                "Flower",
                "Edible",
                "Concentrate",
                "Pre-roll",
                "Vape",
                "Tincture",
                "Topical",
                "Accessory",
                "Beverage",
                "Pills",
                "Crystals",
                "Powder",
              ].map(
                (
                  cat, // copy-lint-disable
                ) => (
                  <MotionTouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(cat)}
                    accessibilityLabel={`Select category ${cat}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: category === cat }}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat && styles.categoryTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </MotionTouchableOpacity>
                ),
              )}
            </View>

            {renderLabel(
              "SKU",
              false,
              "SKU",
              "DRX can generate a unique SKU for this business. A barcode is a separate optional code.",
            )}
            <View style={styles.segmentControl}>
              {[false, true].map((manual) => <MotionTouchableOpacity key={String(manual)}
                style={[styles.segment, manualSku === manual && styles.segmentActive]}
                accessibilityRole="radio" accessibilityState={{ selected: manualSku === manual }}
                onPress={() => setManualSku(manual)}><Text style={[styles.segmentText, manualSku === manual && styles.segmentTextActive]}>{manual ? "Enter my own" : "Generate SKU"}</Text></MotionTouchableOpacity>)}
            </View>
            {manualSku ? <TextInput style={styles.input} accessibilityLabel="SKU" placeholder="e.g. FLOWER-01" value={sku} onChangeText={setSku} placeholderTextColor={COLORS.textMuted} /> :
              <Text style={{ color: COLORS.textSecondary }}>DRX will create a unique SKU when you save.</Text>}
            {renderLabel("Barcode (optional)")}
            <TextInput style={styles.input} accessibilityLabel="Barcode" placeholder="Scanner code, if different from SKU" value={barcode} onChangeText={setBarcode} placeholderTextColor={COLORS.textMuted} />
          </View>

          {/* Unit & Stock */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inventory</Text>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                {renderLabel(
                  "Unit Type",
                  false,
                  "Unit Type",
                  "Choose Weight (grams) for items sold in bulk flower/concentrates. Choose Unit (each) for pre-packaged goods.",
                )}
                <View style={styles.segmentControl}>
                  <MotionTouchableOpacity
                    style={[
                      styles.segment,
                      unitOfMeasure === "g" && styles.segmentActive,
                    ]}
                    onPress={() => setUnitOfMeasure("g")}
                    accessibilityLabel="Measure unit type weight in grams"
                    accessibilityRole="tab"
                    accessibilityState={{ selected: unitOfMeasure === "g" }}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        unitOfMeasure === "g" && styles.segmentTextActive,
                      ]}
                    >
                      Weight (g)
                    </Text>
                  </MotionTouchableOpacity>
                  <MotionTouchableOpacity
                    style={[
                      styles.segment,
                      unitOfMeasure === "unit" && styles.segmentActive,
                    ]}
                    onPress={() => setUnitOfMeasure("unit")}
                    accessibilityLabel="Measure unit type quantity in each units"
                    accessibilityRole="tab"
                    accessibilityState={{ selected: unitOfMeasure === "unit" }}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        unitOfMeasure === "unit" && styles.segmentTextActive,
                      ]}
                    >
                      Unit (ea)
                    </Text>
                  </MotionTouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                {renderLabel(`Initial Stock (${unitOfMeasure})`)}
                <TextInput
                  accessibilityLabel="Initial stock"
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                />
                <Text style={{ color: COLORS.textSecondary }}>
                  Starting stock is recorded with the unit cost above. Receive
                  later stock through inventory intake.
                </Text>
              </View>
            </View>
          </View>

          <FractionalProductFields
            value={{ ...commerce, sellingUnit: unitOfMeasure }}
            onChange={setCommerce}
            basePrice={Number(sellingPrice) || 0}
          />
          {/* Pricing */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Pricing Strategy</Text>
              <MotionTouchableOpacity
                onPress={suggestPricing}
                style={styles.aiButton}
                accessibilityLabel="Get AI pricing suggestions"
                accessibilityRole="button"
              >
                <Ionicons name="sparkles" size={16} color="white" />
                <Text style={styles.aiButtonText}>AI Suggest</Text>
              </MotionTouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                {renderLabel(
                  `Cost per ${unitOfMeasure} ($)`,
                  !usePurchaseBasis,
                  "Cost Price",
                  `What you paid per ${unitOfMeasure}. Or calculate it from a package below.`,
                )}
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  editable={!usePurchaseBasis}
                  value={usePurchaseBasis ? (purchasePreview ? (purchasePreview.unitCostCentsExact / 100).toFixed(2) : "") : costPrice}
                  onChangeText={setCostPrice}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                {renderLabel(
                  `Selling price per ${unitOfMeasure} ($)`,
                  true,
                  "Base Price",
                  `What customers pay for one full ${unitOfMeasure}.`,
                )}
                <TextInput
                  style={[styles.input, { borderColor: COLORS.accent }]}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Purchase cost</Text>
              <View style={styles.segmentControl}>
                {[false, true].map((basis) => <MotionTouchableOpacity key={String(basis)}
                  style={[styles.segment, usePurchaseBasis === basis && styles.segmentActive]}
                  accessibilityRole="radio" accessibilityState={{ selected: usePurchaseBasis === basis }}
                  onPress={() => setUsePurchaseBasis(basis)}><Text style={[styles.segmentText, usePurchaseBasis === basis && styles.segmentTextActive]}>{basis ? "From package" : `Per ${unitOfMeasure}`}</Text></MotionTouchableOpacity>)}
              </View>
              {usePurchaseBasis && <>
                {renderLabel("What did you pay? ($)")}
                <TextInput style={styles.input} accessibilityLabel="Purchase price" keyboardType="decimal-pad" placeholder="160.00" value={purchaseCost} onChangeText={setPurchaseCost} placeholderTextColor={COLORS.textMuted} />
                {renderLabel("How much did you buy?")}
                <TextInput style={styles.input} accessibilityLabel="Purchase quantity" keyboardType="decimal-pad" value={purchaseQuantity} onChangeText={setPurchaseQuantity} />
                <View style={styles.segmentControl}>
                  {(unitOfMeasure === "g" ? ["g", "oz", "lb"] : ["unit"]).map((unit) => <MotionTouchableOpacity key={unit}
                    style={[styles.segment, purchaseUnit === unit && styles.segmentActive]}
                    accessibilityRole="radio" accessibilityState={{ selected: purchaseUnit === unit }}
                    onPress={() => setPurchaseUnit(unit as typeof purchaseUnit)}><Text style={[styles.segmentText, purchaseUnit === unit && styles.segmentTextActive]}>{unit}</Text></MotionTouchableOpacity>)}
                </View>
                {renderLabel(`Actual net amount (${unitOfMeasure}, optional)`)}
                <TextInput style={styles.input} accessibilityLabel="Actual net amount" keyboardType="decimal-pad" placeholder="Use if supplier weight differs" value={actualNet} onChangeText={setActualNet} placeholderTextColor={COLORS.textMuted} />
                {purchasePreview && <Text style={{ color: COLORS.accent }}>
                  ${Number(purchaseCost).toFixed(2)} for {purchasePreview.sellingQuantity.toFixed(4)} {unitOfMeasure} → ${(purchasePreview.unitCostCentsExact / 100).toFixed(2)} per {unitOfMeasure}. Exact cost is retained for stock accounting.
                </Text>}
              </>}
            </View>

            {/* Dynamic Profit & Margin Stats */}
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                padding: SPACING.sm + 4,
                borderRadius: BORDER_RADIUS.sm,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginTop: 4,
                marginBottom: SPACING.md,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  Live Margin Breakdown
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: COLORS.accent,
                    fontWeight: "700",
                  }}
                >
                  CALCULATOR
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", justifyContent: "space-around" }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 9,
                      color: COLORS.textMuted,
                      textTransform: "uppercase",
                    }}
                  >
                    Profit
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color:
                        calculatedProfit >= 0 ? COLORS.success : COLORS.error,
                    }}
                  >
                    ${calculatedProfit.toFixed(2)}
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 9,
                      color: COLORS.textMuted,
                      textTransform: "uppercase",
                    }}
                  >
                    Markup
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color:
                        calculatedMarkup >= 0 ? COLORS.accent : COLORS.error,
                    }}
                  >
                    {calculatedMarkup.toFixed(1)}%
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 9,
                      color: COLORS.textMuted,
                      textTransform: "uppercase",
                    }}
                  >
                    Gross Margin
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color:
                        calculatedMargin >= 0 ? COLORS.success : COLORS.error,
                    }}
                  >
                    {calculatedMargin.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <MotionTouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={
            saving ? "Saving product details" : "Create product and save"
          }
          accessibilityRole="button"
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Create Product"}
          </Text>
        </MotionTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    minHeight: 40,
    minWidth: 40,
    justifyContent: "center",
  },
  title: { fontSize: FONT_SIZES.xl, fontWeight: "700", color: COLORS.text },
  content: { padding: SPACING.md, paddingBottom: 100 },
  section: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
    height: 48, // Accessible height for text input
  },
  row: { flexDirection: "row" },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: SPACING.md,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10, // Accessible chip touch target size
    borderRadius: 24,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  categoryText: { color: COLORS.textSecondary, fontSize: 13 },
  categoryTextActive: { color: "#000", fontWeight: "600" },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: 2,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10, // Increased tap target size
    borderRadius: BORDER_RADIUS.sm,
  },
  segmentActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: { fontSize: 13, color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.text, fontWeight: "600" },

  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6", // specialized purple
    paddingHorizontal: 14,
    paddingVertical: 8, // Accessible tap target
    borderRadius: 20,
    gap: 4,
  },
  aiButtonText: { color: "white", fontSize: 12, fontWeight: "700" },

  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tierRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  removeBtn: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  }, // Accessible button tap target (44x44)

  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14, // Accessible action button height
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#000",
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
});
