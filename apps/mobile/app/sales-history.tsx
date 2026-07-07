import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { getSalesHistory } from "../src/services/apiClient";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function SalesHistory() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { businessId, getToken } = useAuth();
  
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const token = await getToken();
      const data = await getSalesHistory(businessId, token);
      setSales(data);
    } catch (error) {
      console.error("Error fetching sales history:", error);
    } finally {
      setLoading(false);
    }
  }, [businessId, getToken]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const formatCurrency = (value: number) => `$${(value || 0).toFixed(2)}`;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderSale = ({ item }: { item: any }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <View style={styles.saleIdContainer}>
          <Ionicons name="receipt" size={16} color={COLORS.accent} />
          <Text style={styles.saleId}>#{item.id.slice(0, 8)}</Text>
        </View>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: item.status === 'completed' ? COLORS.success + '20' : COLORS.warning + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'completed' ? COLORS.success : COLORS.warning }
          ]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.saleDetails}>
        <Text style={styles.saleDate}>{formatDate(item.created_at)}</Text>
        <Text style={styles.saleTotal}>{formatCurrency(item.total_amount)}</Text>
      </View>
      
      <View style={styles.saleFooter}>
        <Text style={styles.paymentMethod}>
          Payment: <Text style={{ color: COLORS.text }}>{item.payment_method || 'cash'}</Text>
        </Text>
        <Text style={styles.itemsCount}>
          {item.items?.length || 0} item(s)
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Sales History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : sales.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No sales found</Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={renderSale}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  listContent: {
    padding: SPACING.md,
  },
  saleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  saleIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  saleId: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontFamily: "monospace",
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  saleDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: SPACING.sm,
  },
  saleDate: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
  },
  saleTotal: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
  saleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
  },
  paymentMethod: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  itemsCount: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
});
