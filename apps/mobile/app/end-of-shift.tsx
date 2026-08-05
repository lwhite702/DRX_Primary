import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { getPosReconciliation } from "../src/services/apiClient";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function EndOfShift() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // Load today's reconciliation report
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const data = await getPosReconciliation(token, startOfDay.toISOString(), endOfDay.toISOString());
      setReport(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const hasDiscrepancies = report?.discrepancies?.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>End of Shift</Text>
        <TouchableOpacity style={styles.backBtn} onPress={loadReport}>
          <Ionicons name="refresh" size={20} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
             <ActivityIndicator size="large" color={COLORS.accent} />
             <Text style={styles.loadingText}>Generating Shift Report...</Text>
          </View>
        ) : report ? (
          <View>
            <View style={styles.summaryCard}>
              <View style={styles.iconContainer}>
                {hasDiscrepancies ? (
                  <Ionicons name="warning" size={48} color={COLORS.warning} />
                ) : (
                  <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
                )}
              </View>
              <Text style={styles.summaryTitle}>
                {hasDiscrepancies ? "Discrepancies Found" : "All Clear"}
              </Text>
              <Text style={styles.summarySubtitle}>
                {hasDiscrepancies 
                  ? "There are mismatches between recorded sales and inventory changes for this shift."
                  : "Sales and inventory changes match perfectly for this shift."}
              </Text>
            </View>

            {hasDiscrepancies && (
              <View style={styles.discrepanciesSection}>
                <Text style={styles.sectionTitle}>Discrepancies ({report.discrepancies.length})</Text>
                {report.discrepancies.map((item: any, index: number) => (
                  <View key={index} style={styles.discrepancyCard}>
                    <Text style={styles.discrepancyCode}>{item.code.toUpperCase()}</Text>
                    <Text style={styles.discrepancyMessage}>{item.message}</Text>
                    <View style={styles.discrepancyDetails}>
                      <Text style={styles.discrepancyValue}>Expected: {item.expected}</Text>
                      <Text style={styles.discrepancyValue}>Actual: {item.actual}</Text>
                    </View>
                    {item.saleId && (
                      <Text style={styles.discrepancyMeta}>Sale: {item.saleId.slice(0, 8)}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {!hasDiscrepancies && (
              <View style={styles.center}>
                <Text style={styles.readyToCloseText}>
                  You are ready to close out the drawer and end the shift.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.loadingText}>Failed to load report</Text>
          </View>
        )}
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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700" },
  content: { padding: SPACING.md },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xxl },
  loadingText: { color: COLORS.textSecondary, marginTop: SPACING.md },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  summarySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    marginBottom: SPACING.md,
  },
  discrepanciesSection: {
    marginBottom: SPACING.xl,
  },
  discrepancyCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    marginBottom: SPACING.sm,
  },
  discrepancyCode: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    marginBottom: 4,
  },
  discrepancyMessage: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  discrepancyDetails: {
    flexDirection: "row",
    gap: SPACING.lg,
    marginBottom: 4,
  },
  discrepancyValue: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
  },
  discrepancyMeta: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontFamily: "monospace",
  },
  readyToCloseText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    textAlign: "center",
  }
});
