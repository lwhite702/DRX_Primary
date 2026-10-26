import MotionTouchableOpacity from "../src/components/MotionTouchableOpacity";
import { SkeletonBlock, SkeletonSummary } from "../src/components/LoadingSkeleton";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { useAction, useMutation } from "convex/react";
import { api } from "@drx-convex/_generated/api";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function InventoryCheck() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { businessId, userId } = useAuth();
  const selectRandom = useAction(api.inventoryChecks.selectRandom);
  const record = useMutation(api.inventoryChecks.record);
  type Product = NonNullable<FunctionReturnType<typeof api.inventoryChecks.selectRandom>>;
  type Attempt = { product: Product; request: FunctionArgs<typeof api.inventoryChecks.record> };
  const identity = `${businessId ?? ""}:${userId ?? ""}`;
  const scope = useRef(identity); scope.current = identity;
  const generation = useRef(0), busy = useRef(false);
  const pending = useRef(new Map<string, Attempt>());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [measuredWeight, setMeasuredWeight] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRandomProduct = useCallback(async () => {
    const version = ++generation.current;
    setProduct(null); setMeasuredWeight(""); setLoadError(null);
    const attempt = pending.current.get(identity); setRetryPending(Boolean(attempt));
    if (attempt) { setProduct(attempt.product); setMeasuredWeight(String(attempt.request.measuredWeightGrams)); setLoading(false); return; }
    if (!businessId || !userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const selected = await selectRandom({ businessId, expectedUserId: userId });
      if (generation.current === version && scope.current === identity) setProduct(selected);
    } catch {
      if (generation.current === version && scope.current === identity) setLoadError("Inventory check could not be loaded. Try refreshing.");
    } finally { if (generation.current === version && scope.current === identity) setLoading(false); }
  }, [businessId, userId, identity, selectRandom]);

  useEffect(() => {
    void loadRandomProduct();
    return () => { generation.current++; };
  }, [loadRandomProduct]);

  const handleSubmit = async () => {
    if (busy.current || !product || !businessId || !userId) return;
    const origin = identity;
    let attempt = pending.current.get(origin);
    if (!attempt) {
      const measured = Number(measuredWeight);
      if (!measuredWeight.trim() || !Number.isFinite(measured) || measured < 0) { Alert.alert("Check entry", "Enter a valid non-negative measured weight."); return; }
      attempt = { product, request: { businessId, expectedUserId: userId, productId: product.inventory_id, requestId: globalThis.crypto.randomUUID(), expectedWeightGrams: product.expected_weight_grams, measuredWeightGrams: measured } };
      pending.current.set(origin, attempt); setRetryPending(true);
    }
    busy.current = true; setSubmitting(true);
    try {
      const receipt = await record(attempt.request);
      pending.current.delete(origin);
      if (scope.current !== origin) return;
      setRetryPending(false); setProduct(null); setMeasuredWeight("");
      const percentage = receipt.delta_percentage === null ? "percentage not applicable at zero expected stock" : `${receipt.delta_percentage.toFixed(1)}%`;
      const message = receipt.discrepancy_flagged ? `Discrepancy flagged: ${receipt.delta_grams.toFixed(2)}g (${percentage}).` : "Check recorded within tolerance.";
      Alert.alert("Inventory Check Logged", message, [{ text: "Done", onPress: () => { if (scope.current === origin) router.back(); } }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const code = ["STALE_STOCK", "APPROVAL_REQUIRED", "INSUFFICIENT_STOCK", "INVALID_ARGUMENT", "NOT_FOUND", "FORBIDDEN", "UNAUTHORIZED", "INVALID_STATE"].find(code => message.includes(`${code}:`));
      if (code) { pending.current.delete(origin); if (scope.current === origin) setRetryPending(false); }
      if (scope.current === origin) {
        if (code === "STALE_STOCK") void loadRandomProduct();
        Alert.alert("Check not confirmed", code === "STALE_STOCK" ? "Stock changed. A fresh check is loading; measure again." : code === "APPROVAL_REQUIRED" ? "Supervisor approval is required." : code ? "Check inventory, permissions and approval settings before trying again." : "Retry to check or complete the same attempt.");
      }
    } finally { busy.current = false; setSubmitting(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <MotionTouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </MotionTouchableOpacity>
        <Text style={styles.title}>Inventory Check</Text>
        <MotionTouchableOpacity style={styles.backBtn} onPress={loadRandomProduct} disabled={submitting || retryPending || loading}>
          <Ionicons name="refresh" size={20} color={COLORS.accent} />
        </MotionTouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingState}>
             <SkeletonSummary />
             <SkeletonBlock style={styles.loadingField} />
             <SkeletonBlock style={styles.loadingAction} />
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
              editable={!submitting && !retryPending}
              onChangeText={setMeasuredWeight}
              autoFocus
            />

            <MotionTouchableOpacity
              style={styles.actionBtn}
              onPress={handleSubmit}
              disabled={submitting || !measuredWeight}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.actionBtnText}>{retryPending ? "Retry Check" : "Submit Check"}</Text>
              )}
            </MotionTouchableOpacity>
          </View>
        ) : <Text style={styles.loadingText}>{loadError ?? "No product selected. Refresh to start a check."}</Text>}
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
  loadingState: { flex: 1, gap: SPACING.md },
  loadingField: { height: 52, borderRadius: BORDER_RADIUS.md },
  loadingAction: { height: 52, borderRadius: BORDER_RADIUS.md },
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
