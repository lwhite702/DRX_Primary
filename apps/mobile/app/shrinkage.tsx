import React, { useState, useEffect } from "react";
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
import { getProducts, recordShrinkage } from "../src/services/apiClient";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from "../src/constants/theme";

export default function Shrinkage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { legacyBusinessId, getToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("personal_use");
  const [note, setNote] = useState("");

  useEffect(() => {
    const fetchInv = async () => {
      const token = await getToken();
      if (!legacyBusinessId) return;
      const data = await getProducts(legacyBusinessId, token);
      setInventory(data.filter((item: any) => item.inventory_in_grams > 0));
    };
    fetchInv();
  }, [legacyBusinessId, getToken]);

  const handleSubmit = async () => {
    if (!selectedItemId || !quantity) {
      Alert.alert("Error", "Please select an item and enter quantity.");
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      await recordShrinkage(
        token,
        selectedItemId,
        Number(quantity),
        reason,
        note,
      );
      Alert.alert("Loss recorded", "The stock count is up to date.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to record event.");
    } finally {
      setLoading(false);
    }
  };

  const selectedItemName =
    inventory.find((i) => i.id === selectedItemId)?.product_name ||
    "Select an Item";

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
        <View style={styles.pickerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {inventory.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.chip,
                  selectedItemId === item.id && styles.chipSelected,
                ]}
                onPress={() => setSelectedItemId(item.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedItemId === item.id && styles.chipTextSelected,
                  ]}
                >
                  {item.product_name}
                </Text>
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
          onChangeText={setQuantity}
        />

        <Text style={styles.label}>Reason</Text>
        <View style={styles.reasonRow}>
          {["personal_use", "damage", "spillage"].map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.reasonBtn,
                reason === r && styles.reasonBtnSelected,
              ]}
              onPress={() => setReason(r)}
            >
              <Text
                style={[
                  styles.reasonBtnText,
                  reason === r && styles.reasonBtnTextSelected,
                ]}
              >
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
          onChangeText={setNote}
        />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleSubmit}
          disabled={loading || !selectedItemId || !quantity}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.actionBtnText}>Record Event</Text>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700" },
  content: { padding: SPACING.md },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    marginTop: SPACING.lg,
  },
  selectedLabel: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
    fontWeight: "600",
  },
  pickerContainer: { flexDirection: "row", marginTop: SPACING.xs },
  chip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
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
    minWidth: "30%",
  },
  reasonBtnSelected: {
    backgroundColor: COLORS.accent + "20",
    borderColor: COLORS.accent,
  },
  reasonBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  reasonBtnTextSelected: { color: COLORS.accent },
  actionBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  actionBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
});
