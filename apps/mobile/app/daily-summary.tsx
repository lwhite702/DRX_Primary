import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { getDailySummary } from "../src/services/apiClient";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";
import Card from "../src/components/Card";

export default function DailySummary() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stackMetrics = width < 375 || fontScale > 1.3;
  const { businessId, getToken } = useAuth();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      setSummary(null);
      setError("Choose a business to see its sales summary.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await getDailySummary(token);
      setSummary(data);
    } catch {
      setError("Couldn’t load the sales summary. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [businessId, getToken]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const formatCurrency = (value: number) => `$${(value || 0).toFixed(2)}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Daily summary</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} accessibilityLabel="Loading sales summary" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText} accessibilityRole="alert">{error}</Text>
          <TouchableOpacity onPress={fetchSummary} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : summary ? (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}>

          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Total sales</Text>
            <Text style={styles.cardValue}>{formatCurrency(summary.totalGrossSales)}</Text>
          </Card>

          <View style={[styles.row, stackMetrics && { flexDirection: "column" }]}>
            <Card style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Sales</Text>
              <Text style={styles.cardValue}>{summary.totalTransactions}</Text>
            </Card>
            <Card style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Net sales</Text>
              <Text style={styles.cardValue}>{formatCurrency(summary.totalNetSales)}</Text>
            </Card>
          </View>

          <Text style={styles.sectionTitle}>Payment methods</Text>
          <View style={styles.paymentMethodsContainer}>
            {Object.entries(summary.paymentMethodTotals || {}).map(([method, amount]: [string, any]) => (
              <View key={method} style={styles.paymentMethodRow}>
                <Text style={styles.paymentMethodName}>{method.toUpperCase()}</Text>
                <Text style={styles.paymentMethodAmount}>{formatCurrency(amount)}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      ) : (
        <View style={styles.centerContainer}>
          <Ionicons name="stats-chart-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No sales to show yet.</Text>
        </View>
      )}
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
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700", flex: 1, textAlign: "center" },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  content: {
    padding: SPACING.md,
  },
  summaryCard: {
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
  },
  cardValue: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  paymentMethodsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  paymentMethodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  paymentMethodName: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
  },
  paymentMethodAmount: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  retryButton: { minHeight: 48, marginTop: SPACING.md, paddingHorizontal: SPACING.lg, justifyContent: "center", backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md },
  retryText: { color: COLORS.background, fontWeight: "600", fontSize: FONT_SIZES.md },
});
