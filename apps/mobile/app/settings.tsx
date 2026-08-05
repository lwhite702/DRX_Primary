import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { getBusinessSettings } from "../src/services/apiClient";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, getToken } = useAuth();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await getBusinessSettings(token);
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="person" size={24} color={COLORS.textMuted} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user?.primaryEmailAddress?.emailAddress || 'N/A'}</Text>
              </View>
            </View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: COLORS.borderLight }]}>
              <Ionicons name="shield" size={24} color={COLORS.textMuted} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Role</Text>
                <Text style={styles.value}>Staff / Operator</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Settings</Text>
          {loading ? (
             <ActivityIndicator size="small" color={COLORS.accent} />
          ) : settings ? (
            <View style={styles.card}>
              <View style={styles.row}>
                <Ionicons name="storefront" size={24} color={COLORS.textMuted} />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Business Name</Text>
                  <Text style={styles.value}>{settings.business_name || 'N/A'}</Text>
                </View>
              </View>
              <View style={[styles.row, { borderTopWidth: 1, borderTopColor: COLORS.borderLight }]}>
                <Ionicons name="location" size={24} color={COLORS.textMuted} />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Location</Text>
                  <Text style={styles.value}>{settings.location || 'Not set'}</Text>
                </View>
              </View>
              <View style={[styles.row, { borderTopWidth: 1, borderTopColor: COLORS.borderLight }]}>
                <Ionicons name="calculator" size={24} color={COLORS.textMuted} />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Collect Tax</Text>
                  <Text style={styles.value}>{settings.collect_tax ? 'Enabled' : 'Disabled'}</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Could not load business settings.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="color-palette" size={24} color={COLORS.textMuted} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Theme</Text>
                <Text style={[styles.value, { color: COLORS.accent }]}>Neon Velocity</Text>
              </View>
            </View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: COLORS.borderLight }]}>
              <Ionicons name="hardware-chip" size={24} color={COLORS.textMuted} />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Version</Text>
                <Text style={styles.value}>v1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
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
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700" },
  content: {
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.md,
  },
  rowContent: {
    flex: 1,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  value: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
    marginTop: 2,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
    fontStyle: 'italic',
  }
});
