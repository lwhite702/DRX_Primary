import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { getRandomCheckProduct, recordInventoryCheck } from "../src/services/apiClient";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function InventoryCheck() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [measuredWeight, setMeasuredWeight] = useState("");

  const loadRandomProduct = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await getRandomCheckProduct(token);
      setProduct(data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load product for check.", [
        { text: "Go Back", onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  }, [getToken, router]);

  useEffect(() => {
    loadRandomProduct();
  }, [loadRandomProduct]);

  const handleSubmit = async () => {
    if (!product?.inventory_id || !measuredWeight) {
      Alert.alert("Error", "Please enter the measured weight.");
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      const res = await recordInventoryCheck(token, product.inventory_id, Number(measuredWeight));
      
      const discrepancyMsg = res.discrepancy_flagged 
        ? `Discrepancy flagged! Difference: ${res.delta_grams}g (${res.delta_percentage}%)` 
        : `Check successful! Inventory matches expected weight.`;

      Alert.alert("Inventory Check Logged", discrepancyMsg, [
        { text: "Done", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to record inventory check.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Inventory Check</Text>
        <TouchableOpacity style={styles.backBtn} onPress={loadRandomProduct}>
          <Ionicons name="refresh" size={20} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
             <ActivityIndicator size="large" color={COLORS.accent} />
             <Text style={styles.loadingText}>Selecting a random product...</Text>
          </View>
        ) : product ? (
          <View>
            <View style={styles.card}>
              <View style={styles.iconContainer}>
                <Ionicons name="scale-outline" size={48} color={COLORS.accent} />
              </View>
              <Text style={styles.productName}>{product.product_name}</Text>
              <Text style={styles.instruction}>
                Please place all available {product.product_name} on the scale and enter the total measured weight below.
              </Text>
              <Text style={styles.expectedText}>
                Expected: {product.expected_weight_grams?.toFixed(2)}g
              </Text>
            </View>

            <Text style={styles.label}>Measured Weight (Grams)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="e.g. 104.5"
              placeholderTextColor={COLORS.textMuted}
              value={measuredWeight}
              onChangeText={setMeasuredWeight}
              autoFocus
            />

            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={handleSubmit}
              disabled={submitting || !measuredWeight}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.actionBtnText}>Submit Check</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700" },
  content: { flex: 1, padding: SPACING.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: COLORS.textSecondary, marginTop: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent + '15',
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  productName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  instruction: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  expectedText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  label: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    fontSize: FONT_SIZES.xxl,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: SPACING.xl,
  },
  actionBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  actionBtnText: { color: COLORS.background, fontSize: FONT_SIZES.md, fontWeight: "700" }
});
