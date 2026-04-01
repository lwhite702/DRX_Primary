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
  getCustomers,
  createCustomer,
  updateCustomer,
  getCustomerCreditBalance,
} from "../../src/services/apiClient";
import { Customer } from "../../src/lib/types";

export default function Customers() {
  const insets = useSafeAreaInsets();
  const { businessId, getToken } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [creditBalances, setCreditBalances] = useState<Record<string, number>>(
    {},
  );

  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    credit_limit: "0",
    fixed_price_per_gram: "",
  });

  const fetchCustomers = useCallback(async () => {
    if (!businessId) return;

    try {
      const token = await getToken();
      const data = await getCustomers(
        businessId,
        token,
        searchQuery || undefined,
      );
      setCustomers(data);

      // Fetch credit balances for each customer
      const balances: Record<string, number> = {};
      for (const customer of data) {
        try {
          balances[customer.id] = await getCustomerCreditBalance(
            customer.id,
            token,
          );
        } catch {
          balances[customer.id] = 0;
        }
      }
      setCreditBalances(balances);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setRefreshing(false);
    }
  }, [businessId, searchQuery, getToken]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers();
  }, [fetchCustomers]);

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0.00";
    return `$${value.toFixed(2)}`;
  };

  const handleSaveCustomer = async () => {
    if (!businessId) return;
    if (!newCustomer.first_name.trim() || !newCustomer.last_name.trim()) {
      Alert.alert("Error", "First and last name are required");
      return;
    }

    try {
      const token = await getToken();
      const customerData = {
        business_id: businessId,
        first_name: newCustomer.first_name.trim(),
        last_name: newCustomer.last_name.trim(),
        phone: newCustomer.phone.trim() || null,
        email: newCustomer.email.trim() || null,
        credit_limit: parseFloat(newCustomer.credit_limit) || 0,
        loyalty_tier: editingCustomer?.loyalty_tier || "bronze",
        loyalty_points: editingCustomer?.loyalty_points || 0,
        fixed_price_per_gram: newCustomer.fixed_price_per_gram
          ? parseFloat(newCustomer.fixed_price_per_gram)
          : undefined,
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, customerData, token);
        Alert.alert("Success", "Customer updated successfully");
      } else {
        await createCustomer(customerData, token);
        Alert.alert("Success", "Customer added successfully");
      }

      setAddModalVisible(false);
      setEditingCustomer(null);
      setNewCustomer({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        credit_limit: "0",
        fixed_price_per_gram: "",
      });
      fetchCustomers();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message ||
          `Failed to ${editingCustomer ? "update" : "add"} customer`,
      );
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setNewCustomer({
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      credit_limit: "0",
      fixed_price_per_gram: "",
    });
    setAddModalVisible(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone || "",
      email: customer.email || "",
      credit_limit: customer.credit_limit.toString(),
      fixed_price_per_gram: customer.fixed_price_per_gram
        ? customer.fixed_price_per_gram.toString()
        : "",
    });
    setAddModalVisible(true);
  };

  const renderCustomer = ({ item }: { item: Customer }) => {
    const creditUsed = creditBalances[item.id] || 0;
    const creditAvailable = Math.max(0, item.credit_limit - creditUsed);
    const loyaltyTier = item.loyalty_tier || "bronze";

    return (
      <TouchableOpacity style={styles.customerCard} activeOpacity={0.7}>
        <View style={styles.customerHeader}>
          <View
            style={[
              styles.customerAvatar,
              { borderColor: COLORS[loyaltyTier] },
            ]}
          >
            <Text style={styles.avatarText}>{item.first_name.charAt(0)}</Text>
          </View>
          <View style={styles.customerInfo}>
            <View style={styles.headerRow}>
              <View style={styles.nameRow}>
                <Text style={styles.customerName}>
                  {item.first_name} {item.last_name}
                </Text>
                <View
                  style={[
                    styles.tierBadge,
                    { backgroundColor: COLORS[loyaltyTier] + "20" },
                  ]}
                >
                  <Ionicons
                    name={
                      loyaltyTier === "gold"
                        ? "star"
                        : loyaltyTier === "silver"
                          ? "star-half"
                          : "star-outline"
                    }
                    size={12}
                    color={COLORS[loyaltyTier]}
                  />
                  <Text
                    style={[styles.tierText, { color: COLORS[loyaltyTier] }]}
                  >
                    {loyaltyTier.toUpperCase()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => openEditModal(item)}
                style={styles.editBtn}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={COLORS.accent}
                />
              </TouchableOpacity>
            </View>
            {item.phone && (
              <Text style={styles.customerPhone}>{item.phone}</Text>
            )}
            <Text style={styles.loyaltyPoints}>
              {item.loyalty_points} loyalty points
            </Text>
          </View>
        </View>

        <View style={styles.creditSection}>
          <View style={styles.creditItem}>
            <Text style={styles.creditLabel}>Credit Limit</Text>
            <Text style={styles.creditValue}>
              {formatCurrency(item.credit_limit)}
            </Text>
          </View>
          <View style={styles.creditDivider} />
          <View style={styles.creditItem}>
            <Text style={styles.creditLabel}>Used</Text>
            <Text
              style={[
                styles.creditValue,
                { color: creditUsed > 0 ? COLORS.error : COLORS.textSecondary },
              ]}
            >
              {formatCurrency(creditUsed)}
            </Text>
          </View>
          <View style={styles.creditDivider} />
          <View style={styles.creditItem}>
            <Text style={styles.creditLabel}>Available</Text>
            <Text style={[styles.creditValue, { color: COLORS.success }]}>
              {formatCurrency(creditAvailable)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Customer List */}
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
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
            <Ionicons
              name="people-outline"
              size={48}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyText}>No customers found</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAddModal}>
              <Text style={styles.emptyBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add Customer Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + SPACING.md },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustomer.first_name}
                    onChangeText={(t) =>
                      setNewCustomer({ ...newCustomer, first_name: t })
                    }
                    placeholder="First name"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustomer.last_name}
                    onChangeText={(t) =>
                      setNewCustomer({ ...newCustomer, last_name: t })
                    }
                    placeholder="Last name"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={newCustomer.phone}
                onChangeText={(t) =>
                  setNewCustomer({ ...newCustomer, phone: t })
                }
                placeholder="Phone number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={newCustomer.email}
                onChangeText={(t) =>
                  setNewCustomer({ ...newCustomer, email: t })
                }
                placeholder="Email address"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Credit Limit</Text>
              <TextInput
                style={styles.input}
                value={newCustomer.credit_limit}
                onChangeText={(t) =>
                  setNewCustomer({ ...newCustomer, credit_limit: t })
                }
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Fixed Price / Gram ($)</Text>
              <TextInput
                style={styles.input}
                value={newCustomer.fixed_price_per_gram}
                onChangeText={(t) =>
                  setNewCustomer({ ...newCustomer, fixed_price_per_gram: t })
                }
                placeholder="Optional (e.g. 5.00)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveCustomer}
              >
                <Text style={styles.saveBtnText}>
                  {editingCustomer ? "Update" : "Add"} Customer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: FONT_SIZES.md },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  customerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  customerHeader: { flexDirection: "row", alignItems: "center" },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    borderWidth: 2,
  },
  avatarText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
  },
  customerInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  editBtn: {
    padding: 4,
  },
  customerName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  tierText: { fontSize: FONT_SIZES.xs, fontWeight: "600" },
  customerPhone: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  loyaltyPoints: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  creditSection: {
    flexDirection: "row",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  creditItem: { flex: 1, alignItems: "center" },
  creditDivider: { width: 1, backgroundColor: COLORS.border },
  creditLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  creditValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
  },
  emptyText: { color: COLORS.textMuted, marginTop: SPACING.md },
  emptyBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyBtnText: { color: COLORS.background, fontWeight: "600" },
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
  form: { padding: SPACING.md },
  row: { flexDirection: "row", gap: SPACING.md },
  inputGroup: { flex: 1 },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  saveBtn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: "center",
  },
  saveBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
});
