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
import { getDailySummary } from "../src/services/apiClient";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function DailySummary() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { businessId, getToken } = useAuth();
  
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const token = await getToken();
      const data = await getDailySummary(token);
      setSummary(data);
    } catch (error) {
      console.error("Error fetching daily summary:", error);
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Daily Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : summary ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Total Sales</Text>
            <Text style={styles.cardValue}>{formatCurrency(summary.totalGrossSales)}</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.summaryCard, { flex: 1, marginRight: SPACING.sm }]}>
              <Text style={styles.cardTitle}>Transactions</Text>
              <Text style={styles.cardValue}>{summary.totalTransactions}</Text>
            </View>
            <View style={[styles.summaryCard, { flex: 1, marginLeft: SPACING.sm }]}>
              <Text style={styles.cardTitle}>Net Sales</Text>
              <Text style={styles.cardValue}>{formatCurrency(summary.totalNetSales)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Payment Methods</Text>
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
          <Text style={styles.emptyText}>No data available</Text>
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700" },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
  },
  content: {
    padding: SPACING.md,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
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
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
  },
  paymentMethodAmount: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
});
