import { FormSheet } from "../src/components/FormSheet";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@drx-convex/_generated/api";
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from "../src/constants/theme";
import { safeDisplayOrderNumber } from "../src/lib/checkoutMath";
import { useAuth } from "../src/contexts/AuthContext";

import { getCustomers } from "../src/services/apiClient";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["*"],
  admin: ["*"],
  manager: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "sales.void",
    "sales.discount",
    "reports.view_daily",
    "customers.manage",
    "inventory.manage",
    "pricing.manage",
    "settings.configure_pos",
    "reports.view_all",
    "staff.manage",
  ],
  supervisor: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "sales.void",
    "sales.discount",
    "reports.view_daily",
    "customers.manage",
  ],
  cashier: ["sales.create", "payments.process", "shift.view", "catalog.view", "customers.view"],
  staff: ["sales.create", "customers.view", "customers.manage", "inventory.manage"],
  operator: ["sales.create", "customers.view", "customers.manage", "inventory.manage"],
  member: ["sales.create", "customers.view", "customers.manage", "inventory.manage"],
};

function hasEffectivePermission(
  session: { roles?: string[]; permissions?: string[] } | null | undefined,
  permission: string,
): boolean {
  if (!session) return false;
  if (session.permissions?.includes("*") || session.permissions?.includes(permission)) return true;
  return session.roles?.some((role) => {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === "owner" || normalizedRole === "admin") return true;
    return ROLE_PERMISSIONS[normalizedRole]?.includes(permission);
  }) ?? false;
}

const maskName = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? "C"}***`)
    .join(" ");

const customerDisplayName = (customer: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  alias?: string;
}) => {
  const full = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  if (full) return maskName(full);
  if (customer.alias) return customer.alias;
  if (customer.phoneNumber) return `Customer (…${customer.phoneNumber.slice(-4)})`;
  return "Customer";
};

export default function SalesHistory() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, businessId, getToken } = useAuth();
  const canManageSaleCustomers =
    hasEffectivePermission(session, "sales.create") &&
    hasEffectivePermission(session, "customers.manage");
  const sales = useQuery(api.checkout.getSalesHistory);
  const customers = useQuery(api.customers.listCustomers, canManageSaleCustomers ? {} : "skip");
  const updateSale = useMutation(api.checkout.updateSale);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [customerProjections, setCustomerProjections] = useState<
    Array<{
      _id: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      alias?: string;
      isActive: boolean;
    }>
  >([]);
  const [loadingProjections, setLoadingProjections] = useState(false);

  React.useEffect(() => {
    if (!canManageSaleCustomers || !businessId) return;
    let cancelled = false;
    setLoadingProjections(true);
    void (async () => {
      try {
        const token = await getToken();
        const res = await getCustomers(businessId, token);
        if (cancelled) return;
        const mapped = res.map((item: any) => ({
          _id: item.id,
          firstName: item.first_name,
          lastName: item.last_name,
          phoneNumber: item.phone,
          alias: item.alias,
          isActive: item.is_active ?? true,
        }));
        setCustomerProjections(mapped);
      } catch {
        // Fallback to Convex raw documents if offline or fetch fails
      } finally {
        if (!cancelled) setLoadingProjections(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageSaleCustomers, businessId, getToken]);

  const availableCustomers = customerProjections.length > 0
    ? customerProjections.filter((c) => c.isActive)
    : (customers ?? []).filter((c) => c.isActive);

  const attachCustomer = async () => {
    if (!selectedSaleId || !selectedCustomerId || linking) return;
    setLinking(true);
    setLinkError(null);
    try {
      await updateSale({ saleId: selectedSaleId, customerId: selectedCustomerId });
      setSelectedSaleId(null);
      setSelectedCustomerId(null);
      Alert.alert("Customer added", "The customer is now linked to this sale.");
    } catch (error: unknown) {
      setLinkError(error instanceof Error ? error.message : "The customer could not be linked. Try again.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sales history</Text>
        <View style={styles.spacer} />
      </View>
      {sales === undefined ? (
        <ActivityIndicator style={styles.loader} color={COLORS.accent} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No completed sales.</Text>}
          renderItem={({ item }) => {
            const linkedCustomer = availableCustomers.find((customer) => customer._id === item.customerId);
            const canAttachCustomer = canManageSaleCustomers && item.orderStatus.toLowerCase() === "completed" &&
              !item.customerId && item.paymentMethod !== "credit" && (item.creditAmountCents ?? 0) === 0;
            return (
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.order}>{safeDisplayOrderNumber(item.orderNumber)}</Text>
                  <Text style={styles.total}>${(item.totalAmountCents / 100).toFixed(2)}</Text>
                </View>
                <Text style={styles.meta}>
                  {new Date(item.occurredAt ?? item.createdAt).toLocaleString()} · {item.paymentMethod.toUpperCase()}
                </Text>
                <Text style={styles.status}>{item.orderStatus.toUpperCase()}</Text>
                {linkedCustomer ? (
                  <Text style={styles.customerLabel}>Customer: {customerDisplayName(linkedCustomer)}</Text>
                ) : null}
                {canAttachCustomer ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Add customer to sale ${item.orderNumber}`}
                    style={styles.attachButton}
                    onPress={() => {
                      setSelectedSaleId(item._id);
                      setSelectedCustomerId(null);
                      setLinkError(null);
                    }}
                  >
                    <Text style={styles.attachText}>Add customer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <FormSheet visible={selectedSaleId !== null} onClose={() => setSelectedSaleId(null)}>
        <Text style={styles.sheetTitle}>Add customer to sale</Text>
        <Text style={styles.sheetDescription}>Choose a customer for this completed sale.</Text>
        {loadingProjections || (customers === undefined && customerProjections.length === 0) ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : availableCustomers.length === 0 ? (
          <Text style={styles.empty}>No active customers are available.</Text>
        ) : (
          <FlatList
            data={availableCustomers}
            keyExtractor={(customer) => customer._id}
            style={styles.customerList}
            renderItem={({ item }) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCustomerId === item._id }}
                style={[styles.customerOption, selectedCustomerId === item._id && styles.customerOptionSelected]}
                onPress={() => setSelectedCustomerId(item._id)}
              >
                <Text style={styles.customerOptionText}>{customerDisplayName(item)}</Text>
                {selectedCustomerId === item._id ? <Text style={styles.selectedMark}>Selected</Text> : null}
              </TouchableOpacity>
            )}
          />
        )}
        {linkError ? <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text> : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedCustomerId || linking, busy: linking }}
          style={[styles.primary, (!selectedCustomerId || linking) && styles.disabled]}
          onPress={() => void attachCustomer()}
          disabled={!selectedCustomerId || linking}
        >
          {linking ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryText}>Add to sale</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={() => setSelectedSaleId(null)} disabled={linking}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.md, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  back: { color: COLORS.accent, fontSize: FONT_SIZES.md },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700" },
  spacer: { width: 44 },
  loader: { marginTop: 60 },
  list: { padding: SPACING.md },
  empty: { color: COLORS.textMuted, textAlign: "center", padding: SPACING.xl },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  row: { flexDirection: "row", justifyContent: "space-between" },
  order: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: "700" },
  total: { color: COLORS.accent, fontSize: FONT_SIZES.lg, fontWeight: "800" },
  meta: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
  status: { color: COLORS.success, fontSize: FONT_SIZES.xs, fontWeight: "800", marginTop: SPACING.sm },
  customerLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginTop: SPACING.sm },
  attachButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: SPACING.sm, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.accent, borderRadius: BORDER_RADIUS.md },
  attachText: { color: COLORS.accent, fontSize: FONT_SIZES.sm, fontWeight: "800" },
  sheetTitle: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700", marginBottom: SPACING.xs },
  sheetDescription: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginBottom: SPACING.md },
  customerList: { maxHeight: 260 },
  customerOption: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, paddingHorizontal: SPACING.md },
  customerOptionSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + "18" },
  customerOptionText: { color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: "700" },
  selectedMark: { color: COLORS.accent, fontSize: FONT_SIZES.xs, fontWeight: "800" },
  error: { color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
  primary: { alignItems: "center", backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginTop: SPACING.md },
  primaryText: { color: COLORS.background, fontWeight: "900" },
  disabled: { opacity: 0.4 },
  cancel: { minHeight: 48, justifyContent: "center", alignItems: "center", paddingTop: SPACING.md },
  cancelText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
});
