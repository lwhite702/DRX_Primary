import MotionTouchableOpacity from "../src/components/MotionTouchableOpacity";
import { SkeletonRows } from "../src/components/LoadingSkeleton";
import { FormSheet } from "../src/components/FormSheet";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
  const canManageReturns = hasEffectivePermission(session, "sales.void");

  const sales = useQuery(api.checkout.getSalesHistory, {});
  const customers = useQuery(api.customers.listCustomers, canManageSaleCustomers ? {} : "skip");
  const updateSale = useMutation(api.checkout.updateSale);
  const voidOrder = useMutation(api.refunds.voidOrder);
  const refundOrder = useMutation(api.refunds.refundOrder);

  // Customer Linking State
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

  // Void / Refund Action State
  const [actionSale, setActionSale] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"void" | "refund" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionDisposition, setActionDisposition] = useState<"restock" | "scrap">("restock");
  const [actionTenderConfirmed, setActionTenderConfirmed] = useState(false);
  const [actionExternalRef, setActionExternalRef] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const openActionModal = (sale: any, type: "void" | "refund") => {
    setActionSale(sale);
    setActionType(type);
    setActionReason("");
    setActionDisposition("restock");
    const isNoTender = sale.paymentMethod === "comp" || sale.paymentMethod === "credit";
    setActionTenderConfirmed(isNoTender);
    setActionExternalRef("");
    setActionBusy(false);
    setActionError(null);
  };

  const submitAction = async () => {
    if (!actionSale || !actionType || actionBusy) return;
    if (!actionReason.trim()) {
      setActionError("Please provide a reason.");
      return;
    }
    const isCard = actionSale.paymentMethod === "card";
    if (isCard && !actionExternalRef.trim()) {
      setActionError("Card reversals require an external reference.");
      return;
    }
    const isNoTender = actionSale.paymentMethod === "comp" || actionSale.paymentMethod === "credit";
    if (!isNoTender && !actionTenderConfirmed) {
      setActionError("Please confirm the tender reversal.");
      return;
    }

    setActionBusy(true);
    setActionError(null);
    try {
      if (actionType === "void") {
        await voidOrder({
          saleId: actionSale._id,
          reason: actionReason.trim(),
          tenderReversalConfirmed: actionTenderConfirmed,
          externalReference: actionExternalRef.trim() || undefined,
        });
        Alert.alert("Order Voided", `Sale ${safeDisplayOrderNumber(actionSale.orderNumber)} has been voided.`);
      } else {
        await refundOrder({
          saleId: actionSale._id,
          reason: actionReason.trim(),
          disposition: actionDisposition,
          tenderRefundConfirmed: actionTenderConfirmed,
          externalReference: actionExternalRef.trim() || undefined,
        });
        Alert.alert("Order Refunded", `Sale ${safeDisplayOrderNumber(actionSale.orderNumber)} has been refunded.`);
      }
      setActionSale(null);
      setActionType(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "The action could not be completed.");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <MotionTouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>‹ Back</Text>
        </MotionTouchableOpacity>
        <Text style={styles.title}>Sales history</Text>
        <View style={styles.spacer} />
      </View>
      {sales === undefined ? (
        <SkeletonRows style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No sales recorded.</Text>}
          renderItem={({ item }) => {
            const linkedCustomer = availableCustomers.find((customer) => customer._id === item.customerId);
            const isCompleted = item.orderStatus.toLowerCase() === "completed";
            const isCancelled = item.orderStatus.toLowerCase() === "cancelled";
            const isRefunded = item.orderStatus.toLowerCase() === "refunded";
            const canAttachCustomer = canManageSaleCustomers && isCompleted &&
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

                <View style={styles.statusRow}>
                  <Text
                    style={[
                      styles.status,
                      isCancelled && styles.statusCancelled,
                      isRefunded && styles.statusRefunded,
                    ]}
                  >
                    {isCancelled ? "VOIDED" : item.orderStatus.toUpperCase()}
                  </Text>
                  {item.voidReason ? (
                    <Text style={styles.auditReason}>Reason: {item.voidReason}</Text>
                  ) : item.refundReason ? (
                    <Text style={styles.auditReason}>
                      Reason: {item.refundReason}
                      {item.refundDisposition
                        ? ` (${item.refundDisposition === "restock" ? "Restocked" : "Scrapped"})`
                        : ""}
                    </Text>
                  ) : null}
                </View>

                {linkedCustomer ? (
                  <Text style={styles.customerLabel}>Customer: {customerDisplayName(linkedCustomer)}</Text>
                ) : null}
                <View style={styles.cardActions}>
                  {canAttachCustomer ? (
                    <MotionTouchableOpacity
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
                    </MotionTouchableOpacity>
                  ) : null}

                  {canManageReturns && isCompleted ? (
                    <View style={styles.returnActions}>
                      <MotionTouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Void sale ${item.orderNumber}`}
                        style={[styles.smallButton, styles.voidButton]}
                        onPress={() => openActionModal(item, "void")}
                      >
                        <Text style={styles.voidText}>Void</Text>
                      </MotionTouchableOpacity>
                      <MotionTouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Refund sale ${item.orderNumber}`}
                        style={[styles.smallButton, styles.refundButton]}
                        onPress={() => openActionModal(item, "refund")}
                      >
                        <Text style={styles.refundText}>Refund</Text>
                      </MotionTouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Customer Selection Sheet */}
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
              <MotionTouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCustomerId === item._id }}
                style={[styles.customerOption, selectedCustomerId === item._id && styles.customerOptionSelected]}
                onPress={() => setSelectedCustomerId(item._id)}
              >
                <Text style={styles.customerOptionText}>{customerDisplayName(item)}</Text>
                {selectedCustomerId === item._id ? <Text style={styles.selectedMark}>Selected</Text> : null}
              </MotionTouchableOpacity>
            )}
          />
        )}
        {linkError ? <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text> : null}
        <MotionTouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedCustomerId || linking, busy: linking }}
          style={[styles.primary, (!selectedCustomerId || linking) && styles.disabled]}
          onPress={() => void attachCustomer()}
          disabled={!selectedCustomerId || linking}
        >
          {linking ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryText}>Add to sale</Text>}
        </MotionTouchableOpacity>
        <MotionTouchableOpacity style={styles.cancel} onPress={() => setSelectedSaleId(null)} disabled={linking}>
          <Text style={styles.cancelText}>Cancel</Text>
        </MotionTouchableOpacity>
      </FormSheet>

      {/* Void / Refund Action Sheet */}
      <FormSheet visible={actionSale !== null} onClose={() => { if (!actionBusy) setActionSale(null); }}>
        <Text style={styles.sheetTitle}>
          {actionType === "void" ? "Void Order" : "Refund Order"} #{safeDisplayOrderNumber(actionSale?.orderNumber)}
        </Text>
        <Text style={styles.sheetDescription}>
          {actionType === "void"
            ? "Cancels this order and restores inventory back to batches."
            : "Records an audited return and adjusts financial reporting."}
        </Text>

        {actionType === "refund" ? (
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Inventory Handling</Text>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, actionDisposition === "restock" && styles.segmentBtnActive]}
                onPress={() => setActionDisposition("restock")}
              >
                <Text style={[styles.segmentText, actionDisposition === "restock" && styles.segmentTextActive]}>
                  Restock
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, actionDisposition === "scrap" && styles.segmentBtnActive]}
                onPress={() => setActionDisposition("scrap")}
              >
                <Text style={[styles.segmentText, actionDisposition === "scrap" && styles.segmentTextActive]}>
                  Scrap / Waste
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.formField}>
          <Text style={styles.inputLabel}>Reason (Required)</Text>
          <TextInput
            placeholder="e.g., Wrong item, customer return"
            placeholderTextColor={COLORS.textMuted}
            value={actionReason}
            onChangeText={setActionReason}
            style={styles.textInput}
            editable={!actionBusy}
          />
        </View>

        {actionSale?.paymentMethod === "card" ? (
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Card Gateway Reference (Required)</Text>
            <TextInput
              placeholder="e.g., card-refund-tx-123"
              placeholderTextColor={COLORS.textMuted}
              value={actionExternalRef}
              onChangeText={setActionExternalRef}
              style={styles.textInput}
              editable={!actionBusy}
            />
          </View>
        ) : (
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>External Reference (Optional)</Text>
            <TextInput
              placeholder="e.g., Cash App confirmation / note"
              placeholderTextColor={COLORS.textMuted}
              value={actionExternalRef}
              onChangeText={setActionExternalRef}
              style={styles.textInput}
              editable={!actionBusy}
            />
          </View>
        )}

        {actionSale?.paymentMethod !== "credit" && actionSale?.paymentMethod !== "comp" ? (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {actionType === "void"
                ? "Confirm tender reversal returned to customer"
                : "Confirm refund tender paid to customer"}
            </Text>
            <Switch
              value={actionTenderConfirmed}
              onValueChange={setActionTenderConfirmed}
              disabled={actionBusy}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
            />
          </View>
        ) : null}

        {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ busy: actionBusy }}
          style={[styles.primary, actionType === "void" && styles.voidPrimary, actionBusy && styles.disabled]}
          onPress={() => void submitAction()}
          disabled={actionBusy}
        >
          {actionBusy ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.primaryText}>
              {actionType === "void" ? "Confirm Void" : "Confirm Refund"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancel}
          onPress={() => setActionSale(null)}
          disabled={actionBusy}
        >
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
  statusRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACING.xs, marginTop: SPACING.xs },
  status: { color: COLORS.success, fontSize: FONT_SIZES.xs, fontWeight: "800" },
  statusCancelled: { color: COLORS.error },
  statusRefunded: { color: COLORS.warning },
  auditReason: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginLeft: SPACING.xs },
  customerLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginTop: SPACING.sm },
  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACING.sm, flexWrap: "wrap", gap: SPACING.xs },
  attachButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.accent, borderRadius: BORDER_RADIUS.md },
  attachText: { color: COLORS.accent, fontSize: FONT_SIZES.xs, fontWeight: "800" },
  returnActions: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  smallButton: { minHeight: 36, paddingHorizontal: SPACING.md, justifyContent: "center", alignItems: "center", borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  voidButton: { borderColor: COLORS.error + "80", backgroundColor: COLORS.error + "15" },
  voidText: { color: COLORS.error, fontSize: FONT_SIZES.xs, fontWeight: "800" },
  refundButton: { borderColor: COLORS.warning + "80", backgroundColor: COLORS.warning + "15" },
  refundText: { color: COLORS.warning, fontSize: FONT_SIZES.xs, fontWeight: "800" },
  sheetTitle: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700", marginBottom: SPACING.xs },
  sheetDescription: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginBottom: SPACING.md },
  customerList: { maxHeight: 260 },
  customerOption: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, paddingHorizontal: SPACING.md },
  customerOptionSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + "18" },
  customerOptionText: { color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: "700" },
  selectedMark: { color: COLORS.accent, fontSize: FONT_SIZES.xs, fontWeight: "800" },
  formField: { marginBottom: SPACING.sm },
  inputLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: "700", marginBottom: SPACING.xs },
  textInput: { minHeight: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, color: COLORS.text, fontSize: FONT_SIZES.sm, backgroundColor: COLORS.surfaceLight },
  segmentedRow: { flexDirection: "row", gap: SPACING.xs },
  segmentBtn: { flex: 1, minHeight: 40, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md },
  segmentBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + "20" },
  segmentText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: "700" },
  segmentTextActive: { color: COLORS.accent },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: SPACING.sm },
  switchLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, flex: 1, marginRight: SPACING.sm },
  error: { color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
  primary: { alignItems: "center", backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginTop: SPACING.md },
  voidPrimary: { backgroundColor: COLORS.error },
  primaryText: { color: COLORS.background, fontWeight: "900" },
  disabled: { opacity: 0.4 },
  cancel: { minHeight: 48, justifyContent: "center", alignItems: "center", paddingTop: SPACING.md },
  cancelText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
});
