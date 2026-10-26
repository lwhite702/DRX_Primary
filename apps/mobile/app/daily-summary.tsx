import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import MotionTouchableOpacity from "../src/components/MotionTouchableOpacity";
import { SkeletonSummary } from "../src/components/LoadingSkeleton";
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
  const [currentDateStr, setCurrentDateStr] = useState<string | null>(null);
  const [todayDateStr, setTodayDateStr] = useState<string | null>(null);
  const skipDateFetchFor = useRef<string | null>(null);
  const requestSequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shiftDay = (dateStr: string, offsetDays: number) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + offsetDays));
    return date.toISOString().split("T")[0];
  };

  const isToday = currentDateStr !== null && currentDateStr === todayDateStr;

  const fetchSummary = useCallback(async (dateStr?: string) => {
    const requestId = ++requestSequence.current;
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
      const data = await getDailySummary(token, dateStr, dateStr);
      if (requestId !== requestSequence.current) return;
      setSummary(data);
      setTodayDateStr(data.period.todayDateKey);
      if (!dateStr) {
        skipDateFetchFor.current = data.period.dateKey;
        setCurrentDateStr(data.period.dateKey);
      }
    } catch {
      if (requestId !== requestSequence.current) return;
      setError("Couldn’t load the sales summary. Check your connection and try again.");
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [businessId, getToken]);

  useEffect(() => {
    if (currentDateStr && skipDateFetchFor.current === currentDateStr) {
      skipDateFetchFor.current = null;
      return;
    }
    if (currentDateStr) fetchSummary(currentDateStr);
    else fetchSummary();
  }, [currentDateStr, fetchSummary]);

  const handleDateChange = (newDateStr: string) => {
    setCurrentDateStr(newDateStr);
  };

  const formatCurrency = (value: number | null | undefined) =>
    typeof value === "number" ? `$${value.toFixed(2)}` : "—";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <MotionTouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </MotionTouchableOpacity>
        <Text style={styles.title}>Daily summary</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.dateBar}>
        <MotionTouchableOpacity
          style={styles.dayNavBtn}
          onPress={() => currentDateStr && handleDateChange(shiftDay(currentDateStr, -1))}
          disabled={!currentDateStr}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.accent} />
          <Text style={styles.dayNavBtnText}>Previous</Text>
        </MotionTouchableOpacity>

        <View style={styles.dateLabelContainer}>
          <Text style={styles.dateLabelText}>{currentDateStr ?? summary?.period?.dateKey ?? "Today"}</Text>
          <Text style={styles.timezoneText}>{summary?.period?.timezone ?? "Business time"}</Text>
        </View>

        <MotionTouchableOpacity
          style={styles.dayNavBtn}
          onPress={() => currentDateStr && handleDateChange(shiftDay(currentDateStr, 1))}
          disabled={!currentDateStr}
          accessibilityRole="button"
          accessibilityLabel="Next day"
        >
          <Text style={styles.dayNavBtnText}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
        </MotionTouchableOpacity>
      </View>

      {!isToday && (
        <MotionTouchableOpacity
          style={styles.todayBtn}
          onPress={() => setCurrentDateStr(null)}
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
        >
          <Text style={styles.todayBtnText}>Jump to Today</Text>
        </MotionTouchableOpacity>
      )}

      {loading ? (
        <ScrollView contentContainerStyle={styles.summaryLoading}>
          <SkeletonSummary />
          <SkeletonSummary accessibleStatus={false} />
        </ScrollView>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText} accessibilityRole="alert">{error}</Text>
          <MotionTouchableOpacity onPress={() => fetchSummary(currentDateStr ?? undefined)} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </MotionTouchableOpacity>
        </View>
      ) : summary ? (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}>

          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Total sales</Text>
            <Text style={styles.cardValue}>{formatCurrency(summary.today?.salesTotal)}</Text>
          </Card>

          <View style={[styles.row, stackMetrics && { flexDirection: "column" }]}>
            <Card style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Sales</Text>
              <Text style={styles.cardValue}>{typeof summary.today?.salesCount === "number" ? summary.today.salesCount : "—"}</Text>
            </Card>
            <Card style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Cash sales</Text>
              <Text style={styles.cardValue}>{formatCurrency(summary.today?.cashSales)}</Text>
            </Card>
            <Card style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Average sale</Text>
              <Text style={styles.cardValue}>{summary.today?.salesCount === 0 ? "—" : formatCurrency(summary.today?.averageOrderValue)}</Text>
            </Card>
          </View>

          <View style={[styles.row, stackMetrics && { flexDirection: "column" }]}>
            <Card style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Subtotal</Text>
              <Text style={styles.cardValue}>{formatCurrency(summary.today?.subtotal)}</Text>
            </Card>
            <Card style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Tax</Text>
              <Text style={styles.cardValue}>{formatCurrency(summary.today?.totalTax)}</Text>
            </Card>
          </View>

          <Text style={styles.sectionTitle}>Payment methods</Text>
          <View style={styles.paymentMethodsContainer}>
            {summary.paymentMethodTotals && Object.keys(summary.paymentMethodTotals).length > 0 ? (
              Object.entries(summary.paymentMethodTotals).map(([method, amount]: [string, any]) => (
                <View key={method} style={styles.paymentMethodRow}>
                  <Text style={styles.paymentMethodName}>{method.toUpperCase()}</Text>
                  <Text style={styles.paymentMethodAmount}>{formatCurrency(amount)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No payment totals are available for this day.</Text>
            )}
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
  summaryLoading: { flexGrow: 1, padding: SPACING.md, gap: SPACING.md },
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
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  dayNavBtnText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  dateLabelContainer: {
    alignItems: "center",
  },
  dateLabelText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  timezoneText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 1,
  },
  todayBtn: {
    alignSelf: "center",
    marginTop: SPACING.xs,
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  todayBtnText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
  },
});
