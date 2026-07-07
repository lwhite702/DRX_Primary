import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from "../../src/constants/theme";
import {
  getCreditTransactions,
  recordCreditPayment,
  extendCredit,
  getCustomers,
} from "../../src/services/apiClient";
import { Customer } from "../../src/lib/types";

interface CreditWithCustomer {
  id: string;
  customer_id: string;
  amount: number;
  transaction_type: "purchase" | "payment";
  status: string;
  created_at: string;
  customer: { first_name: string; last_name: string } | null;
}

export default function Credits() {
  const insets = useSafeAreaInsets();
  const { businessId, getToken } = useAuth();

  const [transactions, setTransactions] = useState<CreditWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payment modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [paymentAmount, setPaymentAmount] = useState("");

  // Extension modal
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [extensionCustomer, setExtensionCustomer] = useState<Customer | null>(
    null,
  );
  const [extensionAmount, setExtensionAmount] = useState("");
  const [extensionDescription, setExtensionDescription] = useState("");
  const [extensionDueDate, setExtensionDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [customerSelectionModalVisible, setCustomerSelectionModalVisible] =
    useState(false);

  const fetchData = useCallback(async () => {
    if (!businessId) return;

    try {
      const token = await getToken();
      const [txData, customerData] = await Promise.all([
        getCreditTransactions(businessId, token),
        getCustomers(businessId, token),
      ]);
      setTransactions(txData);
      setCustomers(customerData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0.00";
    return `$${value.toFixed(2)}`;
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  };

  // Calculate customer balances
  const getCustomerBalance = (customerId: string) => {
    let balance = 0;
    transactions
      .filter((tx) => tx.customer_id === customerId)
      .forEach((tx) => {
        if (tx.transaction_type === "purchase") balance += tx.amount;
        else if (tx.transaction_type === "payment") balance -= tx.amount;
      });
    return balance;
  };

  const customersWithCredit = customers.filter(
    (c) => getCustomerBalance(c.id) > 0,
  );
  const totalOutstanding = customersWithCredit.reduce(
    (sum, c) => sum + getCustomerBalance(c.id),
    0,
  );

  const handleRecordPayment = async () => {
    if (!businessId || !selectedCustomer) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Enter a valid payment amount");
      return;
    }

    const balance = getCustomerBalance(selectedCustomer.id);
    if (amount > balance) {
      Alert.alert("Error", `Maximum payment is ${formatCurrency(balance)}`);
      return;
    }

    try {
      const token = await getToken();
      await recordCreditPayment(businessId, selectedCustomer.id, amount, token);
      setPaymentModalVisible(false);
      setSelectedCustomer(null);
      setPaymentAmount("");
      fetchData();
      Alert.alert("Success", "Payment recorded successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to record payment");
    }
  };

  const handleExtendCredit = async () => {
    if (!businessId || !extensionCustomer) {
      Alert.alert("Error", "Please select a customer");
      return;
    }

    const amount = parseFloat(extensionAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }

    try {
      const token = await getToken();
      await extendCredit(
        businessId,
        extensionCustomer.id,
        amount,
        extensionDescription,
        extensionDueDate,
        token,
      );
      setExtensionModalVisible(false);
      setExtensionCustomer(null);
      setExtensionAmount("");
      setExtensionDescription("");
      // Reset due date to 30 days from now
      setExtensionDueDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      );
      fetchData();
      Alert.alert("Success", "Credit extended successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to extend credit");
    }
  };

  const renderCustomerCredit = ({ item }: { item: Customer }) => {
    const balance = getCustomerBalance(item.id);
    const customerName =
      item.alias ||
      `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
      "Customer";
    const avatarInitial = customerName.charAt(0) || "C";

    return (
      <View style={styles.creditCard}>
        <View style={styles.creditHeader}>
          <View style={styles.customerAvatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">{customerName}</Text>
            <Text style={styles.creditLimit}>
              Limit: {formatCurrency(item.credit_limit)}
            </Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Owes</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.paymentBtn}
          onPress={() => {
            setSelectedCustomer(item);
            setPaymentAmount("");
            setPaymentModalVisible(true);
          }}
        >
          <Ionicons name="cash" size={18} color={COLORS.background} />
          <Text style={styles.paymentBtnText}>Record Payment</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTransaction = ({ item }: { item: CreditWithCustomer }) => (
    <View style={styles.transactionItem}>
      <View
        style={[
          styles.transactionIcon,
          {
            backgroundColor:
              item.transaction_type === "payment"
                ? COLORS.success + "20"
                : COLORS.error + "20",
          },
        ]}
      >
        <Ionicons
          name={item.transaction_type === "payment" ? "arrow-down" : "arrow-up"}
          size={16}
          color={
            item.transaction_type === "payment" ? COLORS.success : COLORS.error
          }
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionCustomer}>
          {item.customer
            ? `${item.customer.first_name} ${item.customer.last_name}`
            : "Unknown"}
        </Text>
        <Text style={styles.transactionDate}>
          {formatDate(item.created_at || "")}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          {
            color:
              item.transaction_type === "payment"
                ? COLORS.success
                : COLORS.error,
          },
        ]}
      >
        {item.transaction_type === "payment" ? "-" : "+"}
        {formatCurrency(item.amount)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Store Credit</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>Outstanding</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(totalOutstanding)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setExtensionModalVisible(true)}
        >
          <Ionicons name="add-circle" size={32} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Outstanding Credits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Outstanding Balances ({customersWithCredit.length})
        </Text>
        {customersWithCredit.length > 0 ? (
          <FlatList
            data={customersWithCredit}
            keyExtractor={(item) => item.id}
            renderItem={renderCustomerCredit}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptySection}>
            <Ionicons
              name="checkmark-circle"
              size={32}
              color={COLORS.success}
            />
            <Text style={styles.emptySectionText}>No outstanding credits</Text>
          </View>
        )}
      </View>

      {/* Recent Transactions */}
      <View style={[styles.section, { flex: 1 }]}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <FlatList
          data={transactions.slice(0, 20)}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptySection}>
              <Ionicons
                name="wallet-outline"
                size={32}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptySectionText}>No transactions yet</Text>
            </View>
          }
        />
      </View>

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + SPACING.md },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <View style={styles.paymentForm}>
                <View style={styles.paymentCustomerInfo}>
                  <Text style={styles.paymentCustomerName}>
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </Text>
                  <Text style={styles.paymentBalance}>
                    Balance:{" "}
                    {formatCurrency(getCustomerBalance(selectedCustomer.id))}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Payment Amount</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* Quick amounts */}
                <View style={styles.quickAmounts}>
                  {[0.25, 0.5, 0.75, 1].map((fraction) => {
                    const amount =
                      getCustomerBalance(selectedCustomer.id) * fraction;
                    return (
                      <TouchableOpacity
                        key={fraction}
                        style={styles.quickAmountBtn}
                        onPress={() => setPaymentAmount(amount.toFixed(2))}
                      >
                        <Text style={styles.quickAmountText}>
                          {fraction === 1 ? "Full" : `${fraction * 100}%`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPaymentModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleRecordPayment}
              >
                <Text style={styles.confirmBtnText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Extension Modal */}
      <Modal visible={extensionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + SPACING.md },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Extend Credit</Text>
              <TouchableOpacity onPress={() => setExtensionModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentForm}>
              {/* Customer Selection */}
              <Text style={styles.inputLabel}>Customer</Text>
              <TouchableOpacity
                style={styles.customerSelector}
                onPress={() => setCustomerSelectionModalVisible(true)}
              >
                <Text
                  style={[
                    styles.customerSelectorText,
                    !extensionCustomer && { color: COLORS.textMuted },
                  ]}
                >
                  {extensionCustomer
                    ? `${extensionCustomer.first_name} ${extensionCustomer.last_name}`
                    : "Select Customer"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount to Extend</Text>
              <TextInput
                style={styles.paymentInput}
                value={extensionAmount}
                onChangeText={setExtensionAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={styles.inputField}
                value={extensionDescription}
                onChangeText={setExtensionDescription}
                placeholder="Reason for credit"
                placeholderTextColor={COLORS.textMuted}
              />

              {/* Due Date (Simple Text Input for now) */}
              <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.inputField}
                value={extensionDueDate}
                onChangeText={setExtensionDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setExtensionModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleExtendCredit}
              >
                <Text style={styles.confirmBtnText}>Extend Credit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Selection Modal */}
      <Modal
        visible={customerSelectionModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.container, { paddingTop: SPACING.md }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <TouchableOpacity
              onPress={() => setCustomerSelectionModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.customerSelectItem}
                onPress={() => {
                  setExtensionCustomer(item);
                  setCustomerSelectionModalVisible(false);
                }}
              >
                {(() => {
                  const customerName =
                    item.alias ||
                    `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                    "Customer";
                  return (
                    <>
                      <View style={styles.customerAvatar}>
                        <Text style={styles.avatarText}>
                          {customerName.charAt(0) || "C"}
                        </Text>
                      </View>
                      <Text style={styles.customerName}>{customerName}</Text>
                    </>
                  );
                })()}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
  title: { color: COLORS.text, fontSize: FONT_SIZES.xxl, fontWeight: "700" },
  totalBadge: { alignItems: "flex-end" },
  totalLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  totalValue: {
    color: COLORS.error,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
  section: { padding: SPACING.md },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  creditCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  creditHeader: { flexDirection: "row", alignItems: "center" },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
  customerInfo: { flex: 1 },
  customerName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  creditLimit: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  balanceContainer: { alignItems: "flex-end" },
  balanceLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  balanceValue: {
    color: COLORS.error,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
  paymentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  paymentBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  emptySection: { alignItems: "center", padding: SPACING.lg },
  emptySectionText: { color: COLORS.textMuted, marginTop: SPACING.sm },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  transactionInfo: { flex: 1 },
  transactionCustomer: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "500",
  },
  transactionDate: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  transactionAmount: { fontSize: FONT_SIZES.md, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
  },
  paymentForm: { padding: SPACING.md },
  paymentCustomerInfo: { alignItems: "center", marginBottom: SPACING.lg },
  paymentCustomerName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
  },
  paymentBalance: { color: COLORS.error, fontSize: FONT_SIZES.lg },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  paymentInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    color: COLORS.text,
    fontSize: FONT_SIZES.xxxl,
    textAlign: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmounts: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
  },
  quickAmountText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: "center",
  },
  confirmBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  headerBtn: {
    padding: SPACING.xs,
  },
  customerSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customerSelectorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  inputField: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customerSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});
