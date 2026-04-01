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
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Details</Text>

            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Blue Dream"
              value={productName}
              onChangeText={setProductName}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {["Flower", "Edible", "Concentrate", "Pre-roll"].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
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

            <Text style={styles.label}>SKU (Optional)</Text>
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
                <Text style={styles.label}>Unit Type</Text>
                <View style={styles.segmentControl}>
                  <TouchableOpacity
                    style={[
                      styles.segment,
                      unitOfMeasure === "g" && styles.segmentActive,
                    ]}
                    onPress={() => setUnitOfMeasure("g")}
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
                <Text style={styles.label}>
                  Initial Stock ({unitOfMeasure})
                </Text>
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
              >
                <Ionicons name="sparkles" size={16} color="white" />
                <Text style={styles.aiButtonText}>AI Suggest</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                <Text style={styles.label}>Cost Price ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={costPrice}
                  onChangeText={setCostPrice}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Base Price ($)</Text>
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

            {unitOfMeasure === "g" && (
              <View style={{ marginTop: SPACING.md }}>
                <View style={styles.tierHeader}>
                  <Text style={styles.label}>Tiered Pricing (Bulk)</Text>
                  <TouchableOpacity onPress={handleAddTier}>
                    <Text style={{ color: COLORS.accent, fontWeight: "600" }}>
                      + Add Tier
                    </Text>
                  </TouchableOpacity>
                </View>

                {tiers.map((tier, index) => (
                  <View key={index} style={styles.tierRow}>
                    <TextInput
                      style={[styles.input, { flex: 2, marginRight: 8 }]}
                      placeholder="Name (1g)"
                      value={tier.tier_name}
                      onChangeText={(v) => updateTier(index, "tier_name", v)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1.5, marginRight: 8 }]}
                      placeholder="Min g"
                      keyboardType="decimal-pad"
                      value={String(tier.min_weight_grams || "")}
                      onChangeText={(v) =>
                        updateTier(index, "min_weight_grams", v)
                      }
                    />
                    <TextInput
                      style={[styles.input, { flex: 1.5, marginRight: 8 }]}
                      placeholder="$/g"
                      keyboardType="decimal-pad"
                      value={String(tier.price_per_gram || "")}
                      onChangeText={(v) =>
                        updateTier(index, "price_per_gram", v)
                      }
                    />
                    <TouchableOpacity
                      onPress={() => removeTier(index)}
                      style={styles.removeBtn}
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
                    No specific tiers defined. Base price will apply to all
                    weights.
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
  backButton: { padding: 4 },
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
  },
  row: { flexDirection: "row" },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: SPACING.md,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  categoryText: { color: COLORS.textSecondary, fontSize: 13 },
  categoryTextActive: { color: "white", fontWeight: "600" },
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
    paddingVertical: 6,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
  removeBtn: { padding: 4 },

  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
});
