import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../src/contexts/AuthContext";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  WEIGHT_TIERS,
} from "../../../src/constants/theme";
import { createProduct } from "../../../src/services/apiClient";
import { BulkPricingTier } from "../../../src/lib/types";

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { businessId, getToken } = useAuth();
  const [saving, setSaving] = useState(false);

  // Form State
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Flower"); // Default
  const [unitOfMeasure, setUnitOfMeasure] = useState<"g" | "unit">("g");
  const [description] = useState("");

  // Inventory State
  const [stockQuantity, setStockQuantity] = useState("");
  const [minStock] = useState("10");

  // Pricing State
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState(""); // Base price

  // Tiered Pricing State
  const [tiers, setTiers] = useState<Partial<BulkPricingTier>[]>([]);

  // Bulk acquisition calculation states
  const [bulkCost, setBulkCost] = useState("");
  const [bulkWeight, setBulkWeight] = useState("");
  const [bulkRetail, setBulkRetail] = useState("");

  const calculatePerGram = (costVal: string, weightVal: string, target: "cost" | "retail" | "both", retailVal?: string) => {
    const w = parseFloat(weightVal);
    if (!w || isNaN(w) || w <= 0) return;

    if (target === "cost" || target === "both") {
      const c = parseFloat(costVal);
      if (!isNaN(c) && c >= 0) {
        setCostPrice((c / w).toFixed(2));
      }
    }

    if (target === "retail" || target === "both") {
      const r = parseFloat(retailVal !== undefined ? retailVal : bulkRetail);
      if (!isNaN(r) && r >= 0) {
        setSellingPrice((r / w).toFixed(2));
      }
    }
  };

  // Helpers for tooltips/info alerts on mobile
  const showHelp = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: "Got it" }]);
  };

  const renderLabel = (text: string, required = false, helpTitle?: string, helpText?: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Text style={styles.label}>{text}{required ? " *" : ""}</Text>
      {helpTitle && helpText && (
        <TouchableOpacity
          onPress={() => showHelp(helpTitle, helpText)}
          style={{ paddingHorizontal: 6, paddingVertical: 2 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Dynamic profit calculations
  const parsedCost = parseFloat(costPrice) || 0;
  const parsedPrice = parseFloat(sellingPrice) || 0;
  const calculatedProfit = parsedPrice - parsedCost;
  const calculatedMargin = parsedPrice > 0 ? (calculatedProfit / parsedPrice) * 100 : 0;
  const calculatedMarkup = parsedCost > 0 ? (calculatedProfit / parsedCost) * 100 : 0;

  const handleAddTier = () => {
    setTiers([
      ...tiers,
      { min_weight_grams: 0, price_per_gram: 0, tier_name: "" },
    ]);
  };

  const updateTier = (
    index: number,
    field: keyof BulkPricingTier,
    value: string | number,
  ) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  const removeTier = (index: number) => {
    const newTiers = [...tiers];
    newTiers.splice(index, 1);
    setTiers(newTiers);
  };

  const handleSave = async () => {
    if (!productName || !sellingPrice || !costPrice) {
      Alert.alert(
        "Error",
        "Please fill in all required fields (Name, Cost, Price)",
      );
      return;
    }

    if (!businessId) {
      Alert.alert("Error", "Business ID not found");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();

      const payload = {
        business_id: businessId,
        product_name: productName,
        sku: sku || null,
        category: category,
        description: description || null,
        base_unit: unitOfMeasure,
        unit_of_measure: unitOfMeasure,
        quantity_unit: unitOfMeasure === "g" ? "grams" : "units",
        quantity_on_hand:
          unitOfMeasure === "unit" ? parseFloat(stockQuantity || "0") : 0,
        inventory_in_grams:
          unitOfMeasure === "g" ? parseFloat(stockQuantity || "0") : 0,
        cost_price: parseFloat(costPrice),
        selling_price: parseFloat(sellingPrice),
        items_per_unit: 1,
        reorder_level: parseFloat(minStock),
        low_stock_threshold: parseFloat(minStock),
        ai_pricing_enabled: false,
        // Include tiers if you want the backend to handle them, otherwise we might need a separate API call
        // bulk_pricing_rules: unitOfMeasure === "g" ? tiers : [],
      };

      await createProduct(payload, token);

      // Note: Tiers insertion logic is currently disabled as we migrated to single API call.
      // If backend supports tiers in the same payload, uncomment above.

      Alert.alert("Success", "Product added successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error(error);
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

    // Suggest tiers
    if (unitOfMeasure === "g") {
      setTiers([
        {
          tier_name: "1g",
          min_weight_grams: 1,
          max_weight_grams: 3.4,
          price_per_gram: parseFloat(suggestedPrice),
        },
        {
          tier_name: "3.5g",
          min_weight_grams: 3.5,
          max_weight_grams: 6.9,
          price_per_gram: parseFloat(suggestedPrice) * 0.9,
        }, // 10% discount
        {
          tier_name: "7g",
          min_weight_grams: 7,
          max_weight_grams: 13.9,
          price_per_gram: parseFloat(suggestedPrice) * 0.85,
        }, // 15% discount
        {
          tier_name: "14g",
          min_weight_grams: 14,
          max_weight_grams: 27.9,
          price_per_gram: parseFloat(suggestedPrice) * 0.8,
        }, // 20% discount
        {
          tier_name: "28g",
          min_weight_grams: 28,
          max_weight_grams: null,
          price_per_gram: parseFloat(suggestedPrice) * 0.75,
        }, // 25% discount
      ]);
      Alert.alert(
        "AI Suggestion",
        "Applied simplified 3x markup and standard bulk tiers based on cost.",
      );
    } else {
      Alert.alert(
        "AI Suggestion",
        "Applied simplified 3x markup based on cost.",
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Product</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Web Onboarding Recommendation Tip */}
          <View
            accessible={true}
            accessibilityLabel="First Time Setup suggestion card. For a step-by-step guided onboarding experience to configure your first product, we recommend using the web dashboard."
            style={{
              backgroundColor: "rgba(139, 92, 246, 0.08)",
              padding: SPACING.md,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: "rgba(139, 92, 246, 0.2)",
              marginBottom: SPACING.md,
              flexDirection: "row",
              alignItems: "center",
              gap: 12
            }}
          >
            <Ionicons name="desktop-outline" size={20} color="#8B5CF6" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: "600", marginBottom: 2 }}>First Time Setup?</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, lineHeight: 15 }}>
                For a step-by-step guided onboarding experience to configure your first product, we recommend using the web dashboard.
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
              "The name displayed on customer menus, receipts, and order screens."
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
              "Categorizing products makes them easier to find and automatically assigns correct measuring units."
            )}
            <View style={styles.categoryRow}>
              {["Flower", "Edible", "Concentrate", "Pre-roll", "Vape", "Tincture", "Topical", "Accessory", "Beverage", "Pills", "Crystals", "Powder"].map((cat) => ( // copy-lint-disable
                <TouchableOpacity
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
                </TouchableOpacity>
              ))}
            </View>

            {renderLabel(
              "SKU (Optional)",
              false,
              "SKU",
              "Stock Keeping Unit - a unique barcode or code ID. Tap to type or scan a barcode to assign."
            )}
            <TextInput
              style={styles.input}
              placeholder="Scan or type SKU"
              value={sku}
              onChangeText={setSku}
              placeholderTextColor={COLORS.textMuted}
            />
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
                  "Choose Weight (grams) for items sold in bulk flower/concentrates. Choose Unit (each) for pre-packaged goods."
                )}
                <View style={styles.segmentControl}>
                  <TouchableOpacity
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
                  </TouchableOpacity>
                  <TouchableOpacity
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
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                {renderLabel(
                  `Initial Stock (${unitOfMeasure})`,
                  false,
                  "Initial Stock",
                  "The initial quantity currently available in physical inventory to start selling."
                )}
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Pricing Strategy</Text>
              <TouchableOpacity
                onPress={suggestPricing}
                style={styles.aiButton}
                accessibilityLabel="Get AI pricing suggestions"
                accessibilityRole="button"
              >
                <Ionicons name="sparkles" size={16} color="white" />
                <Text style={styles.aiButtonText}>AI Suggest</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                {renderLabel(
                  "Cost Price ($/g)",
                  true,
                  "Cost Price",
                  "What you paid to acquire this product per gram. Crucial for calculating your actual profit margins."
                )}
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={costPrice}
                  onChangeText={(val) => {
                    setCostPrice(val);
                    setBulkCost(""); // Reset bulk helper if manually edited
                  }}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                {renderLabel(
                  "Base Price ($/g)",
                  true,
                  "Base Price",
                  "The base retail price you charge customers per gram. Click 'AI Suggest' for markup recommendations."
                )}
                <TextInput
                  style={[styles.input, { borderColor: COLORS.accent }]}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={sellingPrice}
                  onChangeText={(val) => {
                    setSellingPrice(val);
                    setBulkRetail(""); // Reset bulk helper if manually edited
                  }}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* Bulk Cost & Price Calculator */}
            {unitOfMeasure === "g" && (
              <View style={{
                backgroundColor: "rgba(204, 255, 0, 0.04)",
                padding: SPACING.sm + 2,
                borderRadius: BORDER_RADIUS.sm,
                borderWidth: 1,
                borderColor: "rgba(204, 255, 0, 0.15)",
                marginBottom: SPACING.md
              }}>
                <Text style={{ fontSize: 11, color: COLORS.accent, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" }}>
                  Bulk Calculator Helper
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: COLORS.textSecondary, marginBottom: 2 }}>Bulk Cost ($)</Text>
                    <TextInput
                      style={[styles.input, { marginBottom: 0, paddingVertical: 4, paddingHorizontal: 6, fontSize: 12, height: 32 }]}
                      placeholder="e.g. 150"
                      keyboardType="decimal-pad"
                      value={bulkCost}
                      onChangeText={(val) => {
                        setBulkCost(val);
                        calculatePerGram(val, bulkWeight, "cost");
                      }}
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: COLORS.textSecondary, marginBottom: 2 }}>Bulk Weight (g)</Text>
                    <TextInput
                      style={[styles.input, { marginBottom: 0, paddingVertical: 4, paddingHorizontal: 6, fontSize: 12, height: 32 }]}
                      placeholder="e.g. 28"
                      keyboardType="decimal-pad"
                      value={bulkWeight}
                      onChangeText={(val) => {
                        setBulkWeight(val);
                        calculatePerGram(bulkCost, val, "both");
                      }}
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: COLORS.textSecondary, marginBottom: 2 }}>Bulk Retail ($)</Text>
                    <TextInput
                      style={[styles.input, { marginBottom: 0, paddingVertical: 4, paddingHorizontal: 6, fontSize: 12, height: 32 }]}
                      placeholder="e.g. 450"
                      keyboardType="decimal-pad"
                      value={bulkRetail}
                      onChangeText={(val) => {
                        setBulkRetail(val);
                        calculatePerGram(bulkCost, bulkWeight, "retail", val);
                      }}
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Dynamic Profit & Margin Stats */}
            <View style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              padding: SPACING.sm + 4,
              borderRadius: BORDER_RADIUS.sm,
              borderWidth: 1,
              borderColor: COLORS.border,
              marginTop: 4,
              marginBottom: SPACING.md
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: "600" }}>Live Margin Breakdown</Text>
                <Text style={{ fontSize: 10, color: COLORS.accent, fontWeight: "700" }}>CALCULATOR</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 9, color: COLORS.textMuted, textTransform: "uppercase" }}>Profit</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: calculatedProfit >= 0 ? COLORS.success : COLORS.error }}>
                    ${calculatedProfit.toFixed(2)}
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 9, color: COLORS.textMuted, textTransform: "uppercase" }}>Markup</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: calculatedMarkup >= 0 ? COLORS.accent : COLORS.error }}>
                    {calculatedMarkup.toFixed(1)}%
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 9, color: COLORS.textMuted, textTransform: "uppercase" }}>Gross Margin</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: calculatedMargin >= 0 ? COLORS.success : COLORS.error }}>
                    {calculatedMargin.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>

            {unitOfMeasure === "g" && (
              <View style={{ marginTop: SPACING.md }}>
                <View style={[styles.tierHeader, { marginBottom: 8 }]}>
                  {renderLabel(
                    "Tiered Pricing (Bulk)",
                    false,
                    "Tiered Pricing",
                    "Add discount tiers for larger weight purchases. E.g., setting 3.5g at a lower $/g rate encourages customers to buy more."
                  )}
                </View>

                {/* Predefined weight unit selectors - Non-freeform */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {WEIGHT_TIERS.map((wt) => {
                    const alreadyAdded = tiers.some(t => t.min_weight_grams === wt.grams);
                    return (
                      <TouchableOpacity
                        key={wt.label}
                        disabled={alreadyAdded}
                        onPress={() => {
                          setTiers([
                            ...tiers,
                            { min_weight_grams: wt.grams, price_per_gram: 0, tier_name: wt.label }
                          ]);
                        }}
                        accessibilityLabel={alreadyAdded ? `${wt.label} tier already added` : `Add ${wt.label} tier`}
                        accessibilityRole="button"
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8, // Larger tap targets
                          borderRadius: BORDER_RADIUS.sm,
                          backgroundColor: alreadyAdded ? COLORS.surface : "rgba(204, 255, 0, 0.08)",
                          borderWidth: 1,
                          borderColor: alreadyAdded ? COLORS.border : COLORS.accent,
                          opacity: alreadyAdded ? 0.4 : 1
                        }}
                      >
                        <Text style={{ fontSize: 11, color: alreadyAdded ? COLORS.textMuted : COLORS.accent, fontWeight: "600" }}>
                          + {wt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Clearly labeled columns */}
                {tiers.length > 0 && (
                  <View style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8 }}>
                    <Text style={{ flex: 2, fontSize: 11, fontWeight: "600", color: COLORS.textSecondary }}>Weight Tier (Unit)</Text>
                    <Text style={{ flex: 1.5, fontSize: 11, fontWeight: "600", color: COLORS.textSecondary }}>Price ($/g)</Text>
                    <View style={{ width: 28 }} />
                  </View>
                )}

                {tiers.map((tier, index) => (
                  <View key={index} style={[styles.tierRow, { marginBottom: 8, alignItems: "center" }]}>
                    <View style={{ flex: 2, justifyContent: "center" }}>
                      <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: "500" }}>
                        {tier.tier_name} ({tier.min_weight_grams}g)
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.input, { flex: 1.5, marginRight: 8, marginBottom: 0, paddingVertical: 4, height: 36 }]}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={String(tier.price_per_gram || "")}
                      onChangeText={(v) => updateTier(index, "price_per_gram", v)}
                    />
                    <TouchableOpacity
                      onPress={() => removeTier(index)}
                      style={styles.removeBtn}
                      accessibilityLabel={`Remove ${tier.tier_name} pricing tier`}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={COLORS.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                {tiers.length === 0 && (
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 12,
                      fontStyle: "italic",
                    }}
                  >
                    No specific tiers defined. Base price will apply to all weights.
                  </Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={saving ? "Saving product details" : "Create product and save"}
          accessibilityRole="button"
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Create Product"}
          </Text>
        </TouchableOpacity>
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
  backButton: { padding: 8, minHeight: 40, minWidth: 40, justifyContent: "center" },
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
  removeBtn: { padding: 10, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, // Accessible button tap target (44x44)

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
