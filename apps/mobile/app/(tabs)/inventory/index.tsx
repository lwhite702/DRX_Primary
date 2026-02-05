import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from "../../../src/constants/theme";
import { getProducts } from "../../../src/services/apiClient";
import { Inventory } from "../../../src/lib/types";

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { businessId, getToken } = useAuth();

  const [products, setProducts] = useState<Inventory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!businessId) return;

    try {
      const token = await getToken();
      const data = await getProducts(businessId, token);
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setRefreshing(false);
    }
  }, [businessId, getToken]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0.00";
    return `$${value.toFixed(2)}`;
  };
  const formatWeight = (grams: number | undefined | null) => {
    if (grams === undefined || grams === null) return "0g";
    return grams >= 1
      ? `${grams.toFixed(2)}g`
      : `${(grams * 1000).toFixed(0)}mg`;
  };

  const isWeightBased = (product: Inventory) =>
    product.base_unit === "g" || product.base_unit === "oz";
  const getStock = (product: Inventory) =>
    isWeightBased(product)
      ? product.inventory_in_grams || 0
      : product.quantity_on_hand || 0;

  const getLowStockStatus = (product: Inventory) => {
    const stock = getStock(product);
    const threshold = product.low_stock_threshold || 10;
    if (stock <= 0) return "out";
    if (stock < threshold) return "low";
    return "ok";
  };

  const renderProduct = ({ item }: { item: Inventory }) => {
    const stock = getStock(item);
    const stockStatus = getLowStockStatus(item);

    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productIcon}>
            <Ionicons name="leaf" size={24} color={COLORS.success} />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.product_name}</Text>
            {item.sku && <Text style={styles.productSku}>SKU: {item.sku}</Text>}
          </View>
          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor:
                  stockStatus === "out"
                    ? COLORS.error + "20"
                    : stockStatus === "low"
                      ? COLORS.warning + "20"
                      : COLORS.success + "20",
              },
            ]}
          >
            <Ionicons
              name={
                stockStatus === "out"
                  ? "alert-circle"
                  : stockStatus === "low"
                    ? "warning"
                    : "checkmark-circle"
              }
              size={14}
              color={
                stockStatus === "out"
                  ? COLORS.error
                  : stockStatus === "low"
                    ? COLORS.warning
                    : COLORS.success
              }
            />
            <Text
              style={[
                styles.stockBadgeText,
                {
                  color:
                    stockStatus === "out"
                      ? COLORS.error
                      : stockStatus === "low"
                        ? COLORS.warning
                        : COLORS.success,
                },
              ]}
            >
              {stockStatus === "out"
                ? "OUT"
                : stockStatus === "low"
                  ? "LOW"
                  : "OK"}
            </Text>
          </View>
        </View>

        <View style={styles.productStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Stock</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    stockStatus === "out"
                      ? COLORS.error
                      : stockStatus === "low"
                        ? COLORS.warning
                        : COLORS.text,
                },
              ]}
            >
              {isWeightBased(item) ? formatWeight(stock) : `${stock} units`}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Sell Price</Text>
            <Text style={styles.statValue}>
              {formatCurrency(item.selling_price)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Cost</Text>
            <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>
              {formatCurrency(item.cost_price)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Margin</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {((1 - item.cost_price / item.selling_price) * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Summary stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (p) => getLowStockStatus(p) === "low",
  ).length;
  const outOfStockCount = products.filter(
    (p) => getLowStockStatus(p) === "out",
  ).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>Manage stock & pricing</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(tabs)/inventory/add")}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="cube" size={20} color={COLORS.accent} />
          <Text style={styles.summaryValue}>{totalProducts}</Text>
          <Text style={styles.summaryLabel}>Products</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: COLORS.warning }]}>
          <Ionicons name="warning" size={20} color={COLORS.warning} />
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
            {lowStockCount}
          </Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: COLORS.error }]}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
          <Text style={[styles.summaryValue, { color: COLORS.error }]}>
            {outOfStockCount}
          </Text>
          <Text style={styles.summaryLabel}>Out of Stock</Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={COLORS.accent} />
        <Text style={styles.infoBannerText}>
          Manage products and intake on the web dashboard
        </Text>
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              Add products from the web dashboard
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xxl, fontWeight: "700" },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  summaryContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    marginTop: SPACING.xs,
  },
  summaryLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.accent + "15",
    borderRadius: BORDER_RADIUS.md,
  },
  infoBannerText: { color: COLORS.accent, fontSize: FONT_SIZES.sm, flex: 1 },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  productHeader: { flexDirection: "row", alignItems: "center" },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.success + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  productInfo: { flex: 1 },
  productName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  productSku: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  stockBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: "600" },
  productStats: {
    flexDirection: "row",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  statValue: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  emptySubtext: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
});
