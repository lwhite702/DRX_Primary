import MotionTouchableOpacity from "../src/components/MotionTouchableOpacity";
import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { recordDrawerEvent } from "../src/services/apiClient";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function NoSale() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleOpenDrawer = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      await recordDrawerEvent(token, "no_sale", "Drawer opened from mobile app");
      Alert.alert("Success", "No sale event recorded. Drawer open signal sent.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to record no sale event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <MotionTouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </MotionTouchableOpacity>
        <Text style={styles.title}>Open Drawer</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="cash-outline" size={80} color={COLORS.accent} />
        </View>
        <Text style={styles.instruction}>
          Use this action to record a &quot;No Sale&quot; event and open the cash drawer for change or cash drops.
        </Text>

        <MotionTouchableOpacity
          style={styles.actionBtn}
          onPress={handleOpenDrawer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.actionBtnText}>Record No Sale</Text>
          )}
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700" },
  content: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  instruction: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    textAlign: "center",
    marginBottom: SPACING.xxl,
    lineHeight: 24,
  },
  actionBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    width: "100%",
    alignItems: "center",
  },
  actionBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  }
});
