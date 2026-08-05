import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
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
  WEIGHT_TIERS,
  LOYALTY_DISCOUNTS,
} from "../../src/constants/theme";
import {
  getProducts,
  getCustomers,
  getAIPricingRecommendations,
  applyAIPricingRecommendation,
  getProductUnitAliases,
  createSale,
  createCreditTransaction,
  getCustomerCreditBalance,
} from "../../src/services/apiClient";
import { Inventory, Customer, ProductUnitAlias } from "../../src/lib/types";

import { useCartStore } from "../../src/store/cartStore";

// Interface removed (now in store) or re-imported if needed for props, but try to use store's type.
// But we can just rely on the store's type.
// Actually, let's just leave the local interface if we want, OR remove it and use store.
// Better to remove it to avoid dupes.
import { CartItem } from "../../src/store/cartStore";

export default function POS() {
  const insets = useSafeAreaInsets();
  const { businessId, getToken } = useAuth();

  const [products, setProducts] = useState<Inventory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const {
    cart,
    addToCart: addCtx,
    removeFromCart: removeCtx,
    updateCartItem: updateCtx,
    clearCart: clearCtx,
  } = useCartStore();
  // We renamed to *Ctx just to avoid name collision with local wrapper functions if any,
  // but actually we want to REPLACE the local functions logic where they set state.
  // Let's keep the names simpler in usage:
  // const store = useCartStore();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerCreditBalance, setCustomerCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [editItemModalVisible, setEditItemModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [unitAliases, setUnitAliases] = useState<ProductUnitAlias[]>([]);

  // Weight input
  const [selectedProduct, setSelectedProduct] = useState<Inventory | null>(
    null,
  );
  const [customWeight, setCustomWeight] = useState("");

  // Checkout
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "credit"
  >("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("0");

  const fetchData = useCallback(async () => {
    if (!businessId) return;

    try {
      const token = await getToken();
      const [productsData, customersData, aiData, aliasesData] =
        await Promise.all([
          getProducts(businessId, token),
          getCustomers(businessId, token),
          getAIPricingRecommendations(businessId, token),
          getProductUnitAliases(businessId, token),
        ]);
      setProducts(productsData);
      setCustomers(customersData);
      setAiRecommendations(aiData);
      setUnitAliases(aliasesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [businessId, getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch customer credit when selected
  useEffect(() => {
    if (selectedCustomer) {
      getToken().then((token) => {
        getCustomerCreditBalance(selectedCustomer.id, token)
          .then(setCustomerCreditBalance)
          .catch(() => setCustomerCreditBalance(0));
      });
    } else {
      setCustomerCreditBalance(0);
    }
  }, [selectedCustomer, getToken]);

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0.00";
    return `$${value.toFixed(2)}`;
  };
  const formatWeight = (grams: number | undefined | null) => {
    if (grams === undefined || grams === null) return "0g";
    return grams >= 1 ? `${grams}g` : `${(grams * 1000).toFixed(0)}mg`;
  };

  const isWeightBased = (product: Inventory) =>
    product.base_unit === "g" || product.base_unit === "oz";

  const getStock = (product: Inventory) => {
    if (isWeightBased(product)) {
      return product.inventory_in_grams || 0;
    }
    return product.quantity_on_hand || 0;
  };

  // Calculate loyalty discount
  const getLoyaltyDiscount = () => {
    if (!selectedCustomer) return 0;
    return LOYALTY_DISCOUNTS[selectedCustomer.loyalty_tier] || 0;
  };

  // Open weight modal for weight-based products
  const handleProductPress = (product: Inventory) => {
    if (getStock(product) <= 0) {
      Alert.alert(
        "Out of Stock",
        `${product.product_name} is currently out of stock`,
      );
      return;
    }

    if (isWeightBased(product)) {
      setSelectedProduct(product);
      setCustomWeight("");
      setWeightModalVisible(true);
    } else {
      addToCart(product, 1);
    }
  };

  // Add item to cart
  const addToCart = (product: Inventory, quantity: number) => {
    const stock = getStock(product);
    if (quantity > stock) {
      Alert.alert(
        "Insufficient Stock",
        `Only ${formatWeight(stock)} available`,
      );
      return;
    }

    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id,
    );

    // Determine price logic
    let unitPrice = product.selling_price;
    let originalPrice: number | undefined = undefined;
    let overrideReason: string | undefined = undefined;

    if (selectedCustomer?.fixed_price_per_gram && isWeightBased(product)) {
      unitPrice = selectedCustomer.fixed_price_per_gram;
      originalPrice = product.selling_price;
      overrideReason = "Customer Fixed Price";
    }

    const lineTotal = quantity * unitPrice;

    // Call store
    addCtx({
      product,
      quantity,
      unitPrice,
      lineTotal,
      originalPrice,
      overrideReason,
    });
  };

  // Add weight-based item
  const addWeightToCart = () => {
    if (!selectedProduct) return;

    const weight = parseFloat(customWeight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert("Invalid Weight", "Please enter a valid weight");
      return;
    }

    addToCart(selectedProduct, weight);
    setWeightModalVisible(false);
    setSelectedProduct(null);
  };

  // Quick weight buttons
  const addQuickWeight = (grams: number) => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, grams);
    setWeightModalVisible(false);
    setSelectedProduct(null);
  };

  const updateCartQuantity = (index: number, delta: number) => {
    const item = cart[index];
    const newQty = item.quantity + delta;
    const stock = getStock(item.product);

    if (newQty <= 0) {
      removeCtx(index);
    } else if (newQty > stock) {
      Alert.alert(
        "Insufficient Stock",
        `Only ${formatWeight(stock)} available`,
      );
      return;
    } else {
      updateCtx(index, {
        ...item,
        quantity: newQty,
        lineTotal: newQty * item.unitPrice,
      });
    }
  };

  const openEditItemModal = (index: number) => {
    const item = cart[index];
    setEditingItemIndex(index);
    setEditQuantity(item.quantity.toString());
    setEditPrice(item.unitPrice.toString());
    setEditItemModalVisible(true);
  };

  const handleUpdateCartItem = () => {
    if (editingItemIndex === null) return;

    const quantity = parseFloat(editQuantity);
    const price = parseFloat(editPrice);

    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity");
      return;
    }
    if (isNaN(price) || price < 0) {
      Alert.alert("Invalid Price", "Please enter a valid price");
      return;
    }

    const newCart = [...cart];
    const item = newCart[editingItemIndex];
    const stock = getStock(item.product);

    // Only check stock if increasing quantity beyond current (and not overriding stock logic)
    // For now strict stock check:
    if (quantity > stock) {
      Alert.alert(
        "Insufficient Stock",
        `Only ${formatWeight(stock)} available`,
      );
      return;
    }

    // Check if price is overridden
    const isOverridden = Math.abs(price - item.product.selling_price) > 0.01;

    updateCtx(editingItemIndex, {
      ...item,
      quantity,
      unitPrice: price,
      lineTotal: quantity * price,
      originalPrice: isOverridden ? item.product.selling_price : undefined,
    });

    setEditItemModalVisible(false);
    setEditingItemIndex(null);
  };

  const removeFromCart = (index: number) => {
    removeCtx(index);
  };

  const clearCart = () => {
    clearCtx();
    setSelectedCustomer(null);
    setPaymentMethod("cash");
    setAmountReceived("");
    setIsDelivery(false);
    setDeliveryFee("0");
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const loyaltyDiscount = subtotal * getLoyaltyDiscount();
  const deliveryAmount = isDelivery ? parseFloat(deliveryFee) || 0 : 0;
  const total = subtotal - loyaltyDiscount + deliveryAmount;
  const change = Math.max(0, (parseFloat(amountReceived) || 0) - total);

  // AI Pricing
  const handleApplyAIPricing = async (recommendation: any) => {
    if (!businessId) return;

    try {
      const token = await getToken();
      const result = await applyAIPricingRecommendation(
        businessId,
        recommendation.id,
        token,
      );

      if (result.success) {
        Alert.alert(
          "Success",
          `Price updated to ${formatCurrency(result.newPrice)}`,
        );
        // Remove applied recommendation
        setAiRecommendations((prev) =>
          prev.filter((r) => r.id !== recommendation.id),
        );
        // Refresh products
        fetchData();
      } else {
        Alert.alert("Error", result.message || "Failed to apply pricing");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to apply pricing");
    }
  };

  // Checkout
  const handleCheckout = async () => {
    if (!businessId) {
      Alert.alert("Error", "No business selected");
      return;
    }

    if (cart.length === 0) {
      Alert.alert("Empty Cart", "Add items to cart first");
      return;
    }

    // Credit validation
    if (paymentMethod === "credit") {
      if (!selectedCustomer) {
        Alert.alert("Customer Required", "Select a customer for credit sales");
        return;
      }
      const availableCredit =
        selectedCustomer.credit_limit - customerCreditBalance;
      if (total > availableCredit) {
        Alert.alert(
          "Credit Limit Exceeded",
          `Available credit: ${formatCurrency(availableCredit)}`,
        );
        return;
      }
    }

    try {
      const token = await getToken();
      const amountPaid =
        paymentMethod === "credit" ? 0 : parseFloat(amountReceived) || total;

      await createSale(
        {
          business_id: businessId,
          customer_id: selectedCustomer?.id || null,
          total_amount: total,
          payment_method: paymentMethod,
          payment_ref: null,
          status: "completed",
          delivery_price: deliveryAmount > 0 ? deliveryAmount : null,
          amount_paid: amountPaid,
          change_amount: change,
          items: cart.map((item) => ({
            inventory_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: item.lineTotal,
          })),
        },
        token,
      );

      // Create credit transaction if credit sale
      if (paymentMethod === "credit" && selectedCustomer) {
        await createCreditTransaction(
          {
            business_id: businessId,
            customer_id: selectedCustomer.id,
            amount: total,
            transaction_type: "purchase",
            status: "pending", // Backend sets to completed usually, but okay
            due_date: null,
          },
          token,
        );
      }

      Alert.alert(
        "Sale Complete",
        `Total: ${formatCurrency(total)}${change > 0 ? `\nChange: ${formatCurrency(change)}` : ""}`,
      );
      setCheckoutModalVisible(false);
      clearCart();
      fetchData(); // Refresh inventory
    } catch (error: any) {
      console.error("Sale error:", error);
      Alert.alert("Error", error.message || "Failed to complete sale");
    }
  };

  const renderProduct = ({ item }: { item: Inventory }) => {
    const stock = getStock(item);
    const inCart = cart.find((c) => c.product.id === item.id);

    return (
      <TouchableOpacity
        style={[styles.productCard, stock <= 0 && styles.productCardDisabled]}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productIcon}>
          <Ionicons name="leaf" size={24} color={COLORS.success} />
        </View>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product_name}
        </Text>
        <Text style={styles.productPrice}>
          {formatCurrency(item.selling_price)}
        </Text>
        <Text style={styles.productUnit}>per {item.base_unit || "unit"}</Text>
        <Text
          style={[
            styles.productStock,
            {
              color:
                stock < (item.low_stock_threshold || item.reorder_level || 10)
                  ? COLORS.error
                  : COLORS.textSecondary,
            },
          ]}
        >
          {isWeightBased(item) ? formatWeight(stock) : `${stock} units`}
        </Text>
        {inCart && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              {isWeightBased(inCart.product)
                ? formatWeight(inCart.quantity)
                : inCart.quantity}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({
    item,
    index,
  }: {
    item: CartItem;
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.cartItem}
      onPress={() => openEditItemModal(index)}
    >
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={1}>
          {item.product.product_name}
        </Text>
        <Text style={styles.cartItemDetails}>
          {isWeightBased(item.product)
            ? formatWeight(item.quantity)
            : item.quantity}{" "}
          × {formatCurrency(item.unitPrice)}
          {item.originalPrice && (
            <Text
              style={{
                textDecorationLine: "line-through",
                color: COLORS.textMuted,
              }}
            >
              {" "}
              {formatCurrency(item.originalPrice)}
            </Text>
          )}
        </Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() =>
            updateCartQuantity(index, isWeightBased(item.product) ? -0.5 : -1)
          }
        >
          <Ionicons name="remove" size={16} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() =>
            updateCartQuantity(index, isWeightBased(item.product) ? 0.5 : 1)
          }
        >
          <Ionicons name="add" size={16} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeFromCart(index)}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemTotal}>{formatCurrency(item.lineTotal)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Point of Sale</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => setAiModalVisible(true)}
        >
          <Ionicons name="flash" size={20} color={COLORS.accent} />
          {aiRecommendations.length > 0 && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>{aiRecommendations.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.customerBtn}
          onPress={() => setCustomerModalVisible(true)}
        >
          <Ionicons
            name="person"
            size={18}
            color={selectedCustomer ? COLORS.accent : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.customerBtnText,
              selectedCustomer && { color: COLORS.accent },
            ]}
            numberOfLines={1}
          >
            {selectedCustomer
              ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
              : "Select Customer"}
          </Text>
          {selectedCustomer && (
            <View
              style={[
                styles.loyaltyBadge,
                {
                  backgroundColor: COLORS[selectedCustomer.loyalty_tier] + "30",
                },
              ]}
            >
              <Text
                style={[
                  styles.loyaltyBadgeText,
                  { color: COLORS[selectedCustomer.loyalty_tier] },
                ]}
              >
                {selectedCustomer.loyalty_tier.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Products Grid */}
        <View style={styles.productsSection}>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Cart Panel */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart ({cart.length})</Text>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearBtn}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons
                name="cart-outline"
                size={48}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptyCartText}>Cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>Tap a product to add</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                keyExtractor={(_, index) => index.toString()}
                renderItem={renderCartItem}
                style={styles.cartList}
                showsVerticalScrollIndicator={false}
              />

              <View style={styles.cartSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(subtotal)}
                  </Text>
                </View>
                {loyaltyDiscount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text
                      style={[styles.summaryLabel, { color: COLORS.success }]}
                    >
                      Loyalty ({(getLoyaltyDiscount() * 100).toFixed(0)}%)
                    </Text>
                    <Text
                      style={[styles.summaryValue, { color: COLORS.success }]}
                    >
                      -{formatCurrency(loyaltyDiscount)}
                    </Text>
                  </View>
                )}
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => setCheckoutModalVisible(true)}
              >
                <Ionicons name="card" size={20} color={COLORS.background} />
                <Text style={styles.checkoutBtnText}>Checkout</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Weight Input Modal */}
      <Modal visible={weightModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + SPACING.md },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Weight</Text>
              <TouchableOpacity onPress={() => setWeightModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <View style={styles.weightContent}>
                <Text style={styles.selectedProductName}>
                  {selectedProduct.product_name}
                </Text>
                <Text style={styles.selectedProductPrice}>
                  {formatCurrency(selectedProduct.selling_price)} /{" "}
                  {selectedProduct.base_unit}
                </Text>
                <Text style={styles.stockInfo}>
                  Available: {formatWeight(getStock(selectedProduct))}
                </Text>

                {/* Dynamic Unit Selection */}
                <Text style={styles.quickWeightLabel}>Unit Aliases</Text>
                <View style={[styles.weightTiers, { flexWrap: "wrap" }]}>
                  {unitAliases.map((alias) => (
                    <TouchableOpacity
                      key={alias.id}
                      style={[
                        styles.weightTierBtn,
                        { minWidth: "30%", marginBottom: 8 },
                        getStock(selectedProduct) < alias.quantity &&
                          styles.weightTierBtnDisabled,
                      ]}
                      onPress={() => addQuickWeight(alias.quantity)}
                      disabled={getStock(selectedProduct) < alias.quantity}
                    >
                      <Text style={styles.weightTierText}>
                        {alias.alias_name}
                      </Text>
                      <Text style={styles.weightTierPrice}>
                        {alias.quantity}
                        {alias.standard_unit}
                      </Text>
                      <Text
                        style={[
                          styles.weightTierPrice,
                          { fontSize: 10, color: COLORS.textSecondary },
                        ]}
                      >
                        {formatCurrency(
                          alias.quantity * selectedProduct.selling_price,
                        )}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Weight Input */}
                <Text style={styles.customWeightLabel}>
                  Custom Weight (grams)
                </Text>
                <View style={styles.customWeightInput}>
                  <TextInput
                    style={styles.weightInput}
                    value={customWeight}
                    onChangeText={setCustomWeight}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <Text style={styles.weightUnit}>g</Text>
                </View>
                {customWeight && parseFloat(customWeight) > 0 && (
                  <Text style={styles.customWeightTotal}>
                    Total:{" "}
                    {formatCurrency(
                      parseFloat(customWeight) * selectedProduct.selling_price,
                    )}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.addWeightBtn}
                  onPress={addWeightToCart}
                >
                  <Text style={styles.addWeightBtnText}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Customer Selection Modal */}
      <Modal visible={customerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + SPACING.md, maxHeight: "80%" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setCustomerModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.walkinOption}
              onPress={() => {
                setSelectedCustomer(null);
                setCustomerModalVisible(false);
              }}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={COLORS.textSecondary}
              />
              <Text style={styles.walkinText}>
                Walk-in Customer (No loyalty)
              </Text>
            </TouchableOpacity>

            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.customerOption,
                    selectedCustomer?.id === item.id &&
                      styles.customerOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModalVisible(false);
                  }}
                >
                  {(() => {
                    const customerName =
                      item.alias ||
                      `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                      "Customer";
                    return (
                      <>
                        <View
                          style={[
                            styles.customerAvatar,
                            { borderColor: COLORS[item.loyalty_tier] },
                          ]}
                        >
                          <Text style={styles.avatarText}>
                            {customerName.charAt(0) || "C"}
                          </Text>
                        </View>
                        <View style={styles.customerInfo}>
                          <Text style={styles.customerName}>{customerName}</Text>
                          <View style={styles.customerMeta}>
                            <View
                              style={[
                                styles.tierBadge,
                                {
                                  backgroundColor:
                                    COLORS[item.loyalty_tier] + "20",
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  item.loyalty_tier === "gold"
                                    ? "star"
                                    : item.loyalty_tier === "silver"
                                      ? "star-half"
                                      : "star-outline"
                                }
                                size={12}
                                color={COLORS[item.loyalty_tier]}
                              />
                              <Text
                                style={[
                                  styles.tierText,
                                  { color: COLORS[item.loyalty_tier] },
                                ]}
                              >
                                {item.loyalty_tier.toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.loyaltyPoints}>
                              {item.loyalty_points} pts
                            </Text>
                          </View>
                        </View>
                      </>
                    );
                  })()}
                  <View style={styles.customerCredit}>
                    <Text style={styles.creditLabel}>Credit Limit</Text>
                    <Text style={styles.creditValue}>
                      {formatCurrency(item.credit_limit)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal visible={checkoutModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + SPACING.md },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Checkout</Text>
              <TouchableOpacity onPress={() => setCheckoutModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.checkoutContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Order Summary */}
              <View style={styles.checkoutSection}>
                <Text style={styles.checkoutSectionTitle}>Order Summary</Text>
                {cart.map((item, index) => (
                  <View key={index} style={styles.checkoutItem}>
                    <Text style={styles.checkoutItemName} numberOfLines={1}>
                      {isWeightBased(item.product)
                        ? formatWeight(item.quantity)
                        : `${item.quantity}×`}{" "}
                      {item.product.product_name}
                    </Text>
                    <Text style={styles.checkoutItemPrice}>
                      {formatCurrency(item.lineTotal)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Delivery Toggle */}
              <TouchableOpacity
                style={styles.deliveryToggle}
                onPress={() => setIsDelivery(!isDelivery)}
              >
                <Ionicons
                  name={isDelivery ? "checkbox" : "square-outline"}
                  size={24}
                  color={isDelivery ? COLORS.accent : COLORS.textSecondary}
                />
                <Text style={styles.deliveryToggleText}>Delivery Order</Text>
              </TouchableOpacity>

              {isDelivery && (
                <View style={styles.deliveryFeeInput}>
                  <Text style={styles.inputLabel}>Delivery Fee</Text>
                  <TextInput
                    style={styles.feeInput}
                    value={deliveryFee}
                    onChangeText={setDeliveryFee}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              )}

              {/* Payment Method */}
              <Text style={styles.checkoutSectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                {(["cash", "card", "credit"] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodBtn,
                      paymentMethod === method && styles.paymentMethodBtnActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Ionicons
                      name={
                        method === "cash"
                          ? "cash"
                          : method === "card"
                            ? "card"
                            : "wallet"
                      }
                      size={20}
                      color={
                        paymentMethod === method
                          ? COLORS.background
                          : COLORS.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === method &&
                          styles.paymentMethodTextActive,
                      ]}
                    >
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Credit Info */}
              {paymentMethod === "credit" && selectedCustomer && (
                <View style={styles.creditInfo}>
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color={COLORS.warning}
                  />
                  <Text style={styles.creditInfoText}>
                    Credit limit:{" "}
                    {formatCurrency(selectedCustomer.credit_limit)} | Used:{" "}
                    {formatCurrency(customerCreditBalance)} | Available:{" "}
                    {formatCurrency(
                      selectedCustomer.credit_limit - customerCreditBalance,
                    )}
                  </Text>
                </View>
              )}

              {/* Cash Amount */}
              {paymentMethod === "cash" && (
                <View style={styles.amountInput}>
                  <Text style={styles.inputLabel}>Amount Received</Text>
                  <TextInput
                    style={styles.feeInput}
                    value={amountReceived}
                    onChangeText={setAmountReceived}
                    keyboardType="decimal-pad"
                    placeholder={formatCurrency(total)}
                    placeholderTextColor={COLORS.textMuted}
                  />
                  {change > 0 && (
                    <View style={styles.changeDisplay}>
                      <Text style={styles.changeLabel}>Change:</Text>
                      <Text style={styles.changeValue}>
                        {formatCurrency(change)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Total */}
              <View style={styles.checkoutTotal}>
                <Text style={styles.checkoutTotalLabel}>Total Due</Text>
                <Text style={styles.checkoutTotalValue}>
                  {formatCurrency(total)}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.checkoutActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCheckoutModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={handleCheckout}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.background}
                />
                <Text style={styles.completeBtnText}>Complete Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Pricing Modal */}
      <Modal visible={aiModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + SPACING.md },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Smart Pricing</Text>
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={aiRecommendations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.aiList}
              renderItem={({ item }) => (
                <View style={styles.aiCard}>
                  <View style={styles.aiHeader}>
                    <Text style={styles.aiProductName}>
                      {item.product_name}
                    </Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {(item.confidence_score * 100).toFixed(0)}% Confidence
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.aiReason}>{item.reasoning}</Text>
                  <View style={styles.aiPriceRow}>
                    <View>
                      <Text style={styles.aiLabel}>Current</Text>
                      <Text style={styles.aiOldPrice}>
                        {formatCurrency(item.current_price)}
                      </Text>
                    </View>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                    <View>
                      <Text style={styles.aiLabel}>Recommended</Text>
                      <Text style={styles.aiNewPrice}>
                        {formatCurrency(item.recommended_price)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() => handleApplyAIPricing(item)}
                  >
                    <Text style={styles.applyBtnText}>
                      Apply Recommendation
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No recommendations available
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editItemModalVisible}
        onRequestClose={() => setEditItemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity onPress={() => setEditItemModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: SPACING.md }}>
              <Text style={styles.inputLabel}>Quantity</Text>
              <View style={styles.customWeightInput}>
                <TextInput
                  style={styles.weightInput}
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>
                Unit Price ($)
              </Text>
              <View style={styles.customWeightInput}>
                <TextInput
                  style={styles.weightInput}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View
                style={{
                  marginTop: SPACING.lg,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: SPACING.md,
                  backgroundColor: COLORS.surface,
                  borderRadius: BORDER_RADIUS.md,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.textSecondary }}>Total</Text>
                <Text
                  style={{
                    color: COLORS.accent,
                    fontSize: FONT_SIZES.xl,
                    fontWeight: "700",
                  }}
                >
                  {formatCurrency(
                    (parseFloat(editQuantity) || 0) *
                      (parseFloat(editPrice) || 0),
                  )}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addWeightBtn}
                onPress={handleUpdateCartItem}
              >
                <Text style={styles.addWeightBtnText}>Update Item</Text>
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
  customerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    maxWidth: 200,
  },
  customerBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  loyaltyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  loyaltyBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: "700" },
  content: { flex: 1, flexDirection: "column" },
  productsSection: {
    flex: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cartSection: { flex: 1, padding: SPACING.md },
  productList: { padding: SPACING.sm },
  productRow: { justifyContent: "space-between" },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    width: "48%",
    marginBottom: SPACING.sm,
    alignItems: "center",
    position: "relative",
  },
  productCardDisabled: { opacity: 0.5 },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.success}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  productName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
    minHeight: 40,
  },
  productPrice: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
  productUnit: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  productStock: { fontSize: FONT_SIZES.xs, marginTop: 4 },
  cartBadge: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  cartBadgeText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  cartTitle: { color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: "600" },
  clearBtn: { color: COLORS.error, fontSize: FONT_SIZES.sm },
  emptyCart: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyCartText: {
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  emptyCartSubtext: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  cartList: { flex: 1 },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cartItemInfo: { flex: 1 },
  cartItemName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "500",
  },
  cartItemDetails: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  cartItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: { padding: SPACING.xs },
  cartItemTotal: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    marginLeft: SPACING.sm,
    minWidth: 60,
    textAlign: "right",
  },
  cartSummary: {
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  summaryLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  summaryValue: { color: COLORS.text, fontSize: FONT_SIZES.sm },
  totalRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
  },
  totalValue: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  checkoutBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    maxHeight: "90%",
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

  // Weight Modal
  weightContent: { padding: SPACING.md },
  selectedProductName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    textAlign: "center",
  },
  selectedProductPrice: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.lg,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  stockInfo: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  quickWeightLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  weightTiers: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  weightTierBtn: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weightTierBtnDisabled: { opacity: 0.4 },
  weightTierText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
  weightTierPrice: { color: COLORS.accent, fontSize: FONT_SIZES.sm },
  customWeightLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  customWeightInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weightInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.xxl,
    padding: SPACING.md,
    textAlign: "center",
  },
  weightUnit: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xl,
    paddingRight: SPACING.md,
  },
  customWeightTotal: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.lg,
    textAlign: "center",
    marginTop: SPACING.sm,
    fontWeight: "600",
  },
  addWeightBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  addWeightBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },

  // Customer Modal
  walkinOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  walkinText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md },
  customerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customerOptionSelected: { backgroundColor: `${COLORS.accent}10` },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    borderWidth: 2,
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
  customerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 4,
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
  loyaltyPoints: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  customerCredit: { alignItems: "flex-end" },
  creditLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  creditValue: {
    color: COLORS.success,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },

  // Checkout Modal
  checkoutContent: { padding: SPACING.md },
  checkoutSection: { marginBottom: SPACING.md },
  checkoutSectionTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  checkoutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.xs,
  },
  checkoutItemName: { color: COLORS.text, fontSize: FONT_SIZES.sm, flex: 1 },
  checkoutItemPrice: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "500",
  },
  deliveryToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  deliveryToggleText: { color: COLORS.text, fontSize: FONT_SIZES.md },
  deliveryFeeInput: { marginBottom: SPACING.md },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  feeInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentMethods: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  paymentMethodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentMethodBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  paymentMethodText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  paymentMethodTextActive: { color: COLORS.background },
  creditInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: `${COLORS.warning}15`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  creditInfoText: { color: COLORS.warning, fontSize: FONT_SIZES.xs, flex: 1 },
  amountInput: { marginBottom: SPACING.md },
  changeDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    backgroundColor: `${COLORS.success}15`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  changeLabel: { color: COLORS.success, fontSize: FONT_SIZES.md },
  changeValue: {
    color: COLORS.success,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
  },
  checkoutTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginVertical: SPACING.md,
  },
  checkoutTotalLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
  },
  checkoutTotalValue: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "700",
  },
  checkoutActions: {
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
  completeBtn: {
    flex: 2,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },

  // AI Pricing
  aiBtn: {
    padding: SPACING.sm,
    backgroundColor: `${COLORS.accent}20`,
    borderRadius: BORDER_RADIUS.full,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  aiBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  aiBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  aiList: {
    padding: SPACING.md,
  },
  aiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  aiProductName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  confidenceText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: "600",
  },
  aiReason: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  aiPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  aiLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  aiOldPrice: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    fontWeight: "500",
    textDecorationLine: "line-through",
  },
  aiNewPrice: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.accent,
    fontWeight: "700",
  },
  applyBtn: {
    backgroundColor: COLORS.accent,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  applyBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyStateText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
});
