import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@drx-convex/_generated/api";
import type { FunctionArgs } from "convex/server";
import type { Id } from "@drx-convex/_generated/dataModel";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function Shrinkage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { businessId, userId } = useAuth();
  const recordShrinkage = useMutation(api.shrinkage.record);
  const { results, status, loadMore } = usePaginatedQuery(api.products.listCatalogPage, businessId && userId ? { businessId } : "skip", { initialNumItems: 100 });
  const inventory = results.filter(product => product.businessId === businessId && product.quantityOnHandGrams > 0);
  const identity = `${businessId ?? ""}:${userId ?? ""}`;
  const scope = useRef(identity); scope.current = identity;
  const attempts = useRef(new Map<string, FunctionArgs<typeof api.shrinkage.record>>());
  const busy = useRef(false);
  const [retryPending, setRetryPending] = useState(false);

  const [loading, setLoading] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<Id<"products"> | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<FunctionArgs<typeof api.shrinkage.record>["shrinkageType"]>("personal_use");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (status === "CanLoadMore") loadMore(100);
  }, [status, loadMore]);
  useEffect(() => {
    const pending = attempts.current.get(identity);
    setRetryPending(Boolean(pending)); setSelectedItemId(pending?.productId ?? null);
    setQuantity(pending ? String(pending.quantityGrams) : ""); setReason(pending?.shrinkageType ?? "personal_use"); setNote(pending?.note ?? "");
  }, [identity]);

  const handleSubmit = async () => {
    if (busy.current || !businessId || !userId) return;
    const origin = identity;
    let attempt = attempts.current.get(origin);
    if (!attempt) {
      if (!selectedItemId || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || note.length > 500) {
        Alert.alert("Check entry", "Select a product, enter a positive quantity and keep the note under 500 characters."); return;
      }
      attempt = { businessId, expectedUserId: userId, productId: selectedItemId, requestId: globalThis.crypto.randomUUID(), quantityGrams: Number(quantity), shrinkageType: reason, note };
      attempts.current.set(origin, attempt); setRetryPending(true);
    }
    busy.current = true; setLoading(true);
    try {
      await recordShrinkage(attempt);
      attempts.current.delete(origin);
      if (scope.current !== origin) return;
      setRetryPending(false); setSelectedItemId(null); setQuantity(""); setNote("");
      Alert.alert("Success", "Shrinkage event recorded successfully.", [{ text: "OK", onPress: () => { if (scope.current === origin) router.back(); } }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const known = ["APPROVAL_REQUIRED", "INSUFFICIENT_STOCK", "INVALID_ARGUMENT", "NOT_FOUND", "FORBIDDEN", "UNAUTHORIZED", "INVALID_STATE"].find(code => message.includes(`${code}:`));
      if (known) { attempts.current.delete(origin); if (scope.current === origin) setRetryPending(false); }
      if (scope.current === origin) Alert.alert("Shrinkage not confirmed", known === "APPROVAL_REQUIRED" ? "Supervisor approval is required." : known === "INSUFFICIENT_STOCK" ? "Insufficient stock. Check the quantity." : known ? "Check your inventory, permissions and approval settings before trying again." : "Retry to check or complete the same removal.");
    } finally { busy.current = false; setLoading(false); }
  };

  const selectedItemName = inventory.find(i => i._id === selectedItemId)?.productName || "Select an Item";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Record Shrinkage</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Item</Text>
        {status === "LoadingFirstPage" && <ActivityIndicator color={COLORS.accent} />}
        {retryPending && <Text style={styles.label}>This attempt is awaiting confirmation. Retry the same removal.</Text>}
        <View style={styles.pickerContainer}>
           <ScrollView horizontal showsHorizontalScrollIndicator={false}>
             {inventory.map(item => (
                <TouchableOpacity
                  key={item._id}
                  style={[
                    styles.chip,
                    selectedItemId === item._id && styles.chipSelected
                  ]}
                  disabled={loading || retryPending}
                  onPress={() => setSelectedItemId(item._id)}
                >
                  <Text style={[
                    styles.chipText,
                    selectedItemId === item._id && styles.chipTextSelected
                  ]}>{item.productName}</Text>
                </TouchableOpacity>
             ))}
           </ScrollView>
        </View>
        <Text style={styles.selectedLabel}>Selected: {selectedItemName}</Text>

        <Text style={styles.label}>Weight (Grams)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="e.g. 3.5"
          placeholderTextColor={COLORS.textMuted}
          value={quantity}
          editable={!loading && !retryPending}
          onChangeText={setQuantity}
        />

        <Text style={styles.label}>Reason</Text>
        <View style={styles.reasonRow}>
          {(["personal_use", "damage", "spillage"] as const).map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.reasonBtn, reason === r && styles.reasonBtnSelected]}
              disabled={loading || retryPending}
              onPress={() => setReason(r)}
            >
              <Text style={[styles.reasonBtnText, reason === r && styles.reasonBtnTextSelected]}>
                {r.replace("_", " ").toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Note (Optional)</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Add any additional details..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={note}
          editable={!loading && !retryPending}
          maxLength={500}
          onChangeText={setNote}
        />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleSubmit}
          disabled={loading || !businessId || !userId || !selectedItemId || !quantity}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.actionBtnText}>{retryPending ? "Retry Event" : "Record Event"}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  content: { padding: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginBottom: SPACING.xs, marginTop: SPACING.lg },
  selectedLabel: { color: COLORS.accent, fontSize: FONT_SIZES.sm, marginTop: SPACING.sm, fontWeight: "600" },
  pickerContainer: { flexDirection: "row", marginTop: SPACING.xs },
  chip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  chipSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.text, fontSize: FONT_SIZES.sm },
  chipTextSelected: { color: COLORS.background, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  reasonRow: { flexDirection: "row", gap: SPACING.sm, flexWrap: "wrap" },
  reasonBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    minWidth: '30%',
  },
  reasonBtnSelected: { backgroundColor: COLORS.accent + '20', borderColor: COLORS.accent },
  reasonBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  reasonBtnTextSelected: { color: COLORS.accent },
  actionBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  actionBtnText: { color: COLORS.background, fontSize: FONT_SIZES.md, fontWeight: "700" }
});
