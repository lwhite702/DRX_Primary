import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useAuth } from "../src/contexts/AuthContext";
import { useOffline } from "../src/contexts/OfflineContext";
import {
  acknowledgeDeliveryReminder,
  listDueDeliveryReminders,
} from "../src/offline/database";
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from "../src/constants/theme";
import {
  buildDeliveryReminderSchedule,
  captureReminderPersistenceWarning,
  nextUnreadDeliveryNotification,
  shouldClearLocalDeliveryReminders,
} from "../src/lib/deliveryReminders";
import {
  clearLocalDeliveryNotifications,
  reconcileLocalDeliveryNotifications,
  replaceLocalDeliveryNotifications,
} from "../src/lib/localDeliveryNotifications";

type DeliveryStatus =
  | "ready_for_dispatch"
  | "uber_ordered"
  | "handed_off"
  | "delivered"
  | "canceled";

type Delivery = {
  _id: string;
  saleId: string;
  orderNumber: string;
  status: DeliveryStatus;
  addressLabel: string;
  assignedToUserId?: string;
  vendorFeeCents: number;
  customerFeeCents: number;
  dispatchDueAt: number;
  estimatedArrivalAt?: number;
  createdAt: number;
};
type MarkUberOrderedResult = {
  success: true;
  estimatedArrivalAt: number;
};
type DeliveryNotification = {
  _id: string;
  deliveryId: string;
  kind: "dispatch_overdue" | "eta_warning" | "eta_due" | "overdue" | "manager_escalation";
  message: string;
  createdAt: number;
};

const deliveryApi = anyApi.deliveries;
const statusLabel: Record<DeliveryStatus, string> = {
  ready_for_dispatch: "READY FOR DISPATCH",
  uber_ordered: "UBER ORDERED",
  handed_off: "HANDED OFF",
  delivered: "DELIVERED",
  canceled: "CANCELED",
};
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function DeliveriesScreen() {
  usePreventScreenCapture("drx-deliveries");
  const insets = useSafeAreaInsets();
  const { businessId, userId, session } = useAuth();
  const { isOnline } = useOffline();
  const deliveries = useQuery(deliveryApi.listDeliveries, {}) as Delivery[] | undefined;
  const unreadNotifications = useQuery(
    deliveryApi.listUnreadNotifications,
    isOnline ? {} : "skip",
  ) as DeliveryNotification[] | undefined;
  const assignDelivery = useMutation(deliveryApi.assignDelivery);
  const markUberOrdered = useMutation(deliveryApi.markUberOrdered);
  const markHandedOff = useMutation(deliveryApi.markHandedOff);
  const markDelivered = useMutation(deliveryApi.markDelivered);
  const cancelDelivery = useMutation(deliveryApi.cancelDelivery);
  const getDeliveryAddress = useMutation(deliveryApi.getDeliveryAddress);
  const acknowledgeNotification = useMutation(deliveryApi.acknowledgeNotification);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [waitMinutes, setWaitMinutes] = useState("15");
  const [working, setWorking] = useState(false);
  const [revealedAddress, setRevealedAddress] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const activeReminderKey = useRef<string | null>(null);
  const [notificationPump, setNotificationPump] = useState(0);
  const canCancel =
    session?.roles.some((role) => ["owner", "admin"].includes(role.toLowerCase())) === true;
  const canReassign =
    session?.roles.some((role) => ["owner", "admin", "manager"].includes(role.toLowerCase())) === true;

  const sorted = useMemo(
    () =>
      [...(deliveries ?? [])].sort((left, right) => {
        const leftClosed = left.status === "delivered" || left.status === "canceled";
        const rightClosed = right.status === "delivered" || right.status === "canceled";
        if (leftClosed !== rightClosed) return leftClosed ? 1 : -1;
        return (left.dispatchDueAt ?? left.createdAt) - (right.dispatchDueAt ?? right.createdAt);
      }),
    [deliveries],
  );

  useEffect(() => {
    const notification = nextUnreadDeliveryNotification(unreadNotifications ?? []);
    if (!isOnline || !notification || activeReminderKey.current) return;
    activeReminderKey.current = `server:${notification._id}`;
    Alert.alert("Delivery reminder", notification.message, [
      {
        text: "Acknowledge",
        onPress: () => {
          void (async () => {
            try {
              await acknowledgeNotification({ notificationId: notification._id });
              if (businessId && userId) {
                const due = await listDueDeliveryReminders(businessId, userId);
                for (const reminder of due) {
                  if (
                    reminder.deliveryId === notification.deliveryId &&
                    reminder.kind === notification.kind
                  ) {
                    await acknowledgeDeliveryReminder(reminder);
                  }
                }
              }
            } catch (error) {
              Alert.alert(
                "Reminder not acknowledged",
                error instanceof Error ? error.message : "The reminder will reappear after synchronization.",
              );
              setTimeout(() => setNotificationPump((current) => current + 1), 1_000);
            } finally {
              activeReminderKey.current = null;
            }
          })();
        },
      },
    ]);
  }, [
    acknowledgeNotification,
    businessId,
    isOnline,
    notificationPump,
    unreadNotifications,
    userId,
  ]);

  useEffect(() => {
    if (!businessId || !userId || !deliveries) return;
    for (const delivery of deliveries) {
      if (shouldClearLocalDeliveryReminders(delivery, userId)) {
        void clearLocalDeliveryNotifications(businessId, userId, delivery._id);
      } else if (
        delivery.status === "uber_ordered" &&
        delivery.assignedToUserId === userId &&
        delivery.estimatedArrivalAt
      ) {
        void reconcileLocalDeliveryNotifications({
          businessId,
          userId,
          deliveryId: delivery._id,
          orderNumber: delivery.orderNumber,
          reminders: buildDeliveryReminderSchedule(delivery.estimatedArrivalAt),
        });
      }
    }
  }, [businessId, deliveries, userId]);

  const perform = async (operation: () => Promise<unknown>) => {
    if (!isOnline) {
      Alert.alert("Connection required", "Delivery status changes sync immediately for every operator.");
      return;
    }
    setWorking(true);
    try {
      await operation();
      setSelected(null);
    } catch (error) {
      Alert.alert("Delivery not updated", error instanceof Error ? error.message : "Try again.");
    } finally {
      setWorking(false);
    }
  };

  const orderUber = async (delivery: Delivery) => {
    const minutes = Number(waitMinutes);
    if (!Number.isInteger(minutes) || minutes < 2 || minutes > 1_440) {
      Alert.alert("Wait time required", "Enter a whole-number wait time from 2 to 1,440 minutes.");
      return;
    }
    await perform(async () => {
      const result = await markUberOrdered({
        deliveryId: delivery._id,
        waitMinutes: minutes,
      }) as MarkUberOrderedResult;
      if (businessId && userId) {
        const warning = await captureReminderPersistenceWarning(() =>
          replaceLocalDeliveryNotifications({
            businessId,
            userId,
            deliveryId: delivery._id,
            orderNumber: delivery.orderNumber,
            reminders: buildDeliveryReminderSchedule(result.estimatedArrivalAt),
          }),
        );
        if (warning) {
          Alert.alert(
            "Uber ordered",
            "The shared delivery status was updated, but this device could not schedule its offline OS reminders. Use another operator device until reminders resynchronize.",
          );
        }
      }
    });
  };

  const assignToCurrentOperator = async (delivery: Delivery) => {
    await perform(async () => {
      await assignDelivery({ deliveryId: delivery._id });
      if (businessId && userId) {
        const warning = await captureReminderPersistenceWarning(() =>
          reconcileLocalDeliveryNotifications({
            businessId,
            userId,
            deliveryId: delivery._id,
            orderNumber: delivery.orderNumber,
            reminders: delivery.status === "uber_ordered" && delivery.estimatedArrivalAt
              ? buildDeliveryReminderSchedule(delivery.estimatedArrivalAt)
              : [],
          }),
        );
        if (warning) {
          Alert.alert(
            "Delivery reassigned",
            "The shift handoff succeeded, but this device could not reconcile its offline OS reminders. Use another operator device until reminders resynchronize.",
          );
        }
      }
    });
  };

  const completeStatus = async (
    delivery: Delivery,
    mutation: (args: { deliveryId: string }) => Promise<unknown>,
  ) => {
    await perform(async () => {
      await mutation({ deliveryId: delivery._id });
      if (businessId && userId) {
        await clearLocalDeliveryNotifications(businessId, userId, delivery._id);
      }
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: true, title: "Deliveries" }} />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>OPERATOR FULFILLMENT</Text>
          <Text style={styles.title}>Deliveries</Text>
        </View>
        <Text style={[styles.connection, !isOnline && styles.offline]}>
          {isOnline ? "LIVE" : "OFFLINE REMINDERS"}
        </Text>
      </View>

      {deliveries === undefined ? (
        <ActivityIndicator style={styles.loading} color={COLORS.accent} />
      ) : (
        <FlatList
          data={sorted}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<Text style={styles.empty}>No deliveries require attention.</Text>}
          renderItem={({ item }) => {
            const overdue = item.status === "ready_for_dispatch" && Date.now() > item.dispatchDueAt;
            return (
              <TouchableOpacity style={[styles.card, overdue && styles.overdueCard]} onPress={() => {
                setRevealedAddress(null);
                setCancellationReason("");
                setSelected(item);
              }}>
                <View style={styles.cardHeading}>
                  <Text style={styles.order}>{item.orderNumber}</Text>
                  <Text style={[styles.status, overdue && styles.overdueText]}>{statusLabel[item.status]}</Text>
                </View>
                <Text style={styles.address}>{item.addressLabel}</Text>
                <View style={styles.cardHeading}>
                  <Text style={styles.meta}>Vendor {money(item.vendorFeeCents)}</Text>
                  <Text style={styles.meta}>
                    {item.status === "ready_for_dispatch"
                      ? overdue
                        ? "ORDER UBER NOW"
                        : `Due ${new Date(item.dispatchDueAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                      : item.estimatedArrivalAt
                        ? `ETA ${new Date(item.estimatedArrivalAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                        : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
            {selected ? (
              <>
                <Text style={styles.title}>{selected.orderNumber}</Text>
                <Text style={styles.assignmentText}>
                  {selected.assignedToUserId === userId
                    ? "Assigned to you"
                    : selected.assignedToUserId
                      ? "Assigned to another operator"
                      : "Unassigned"}
                </Text>
                <Text selectable style={styles.address}>{revealedAddress ?? selected.addressLabel}</Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  disabled={working}
                  onPress={() => {
                    setWorking(true);
                    void getDeliveryAddress({ deliveryId: selected._id })
                      .then((result: { address: string }) => setRevealedAddress(result.address))
                      .catch((error: unknown) =>
                        Alert.alert("Address unavailable", error instanceof Error ? error.message : "Try again."),
                      )
                      .finally(() => setWorking(false));
                  }}
                >
                  <Text style={styles.secondaryText}>VIEW DELIVERY ADDRESS</Text>
                </TouchableOpacity>
                {selected.status !== "delivered" &&
                selected.status !== "canceled" &&
                selected.assignedToUserId !== userId &&
                (!selected.assignedToUserId || canReassign) ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    disabled={working}
                    onPress={() => void assignToCurrentOperator(selected)}
                  >
                    <Text style={styles.secondaryText}>
                      {selected.assignedToUserId ? "TAKE OVER SHIFT" : "ASSIGN TO ME"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {selected.status === "ready_for_dispatch" && selected.assignedToUserId === userId ? (
                  <>
                    <TextInput
                      style={styles.waitInput}
                      value={waitMinutes}
                      onChangeText={setWaitMinutes}
                      keyboardType="number-pad"
                      placeholder="Courier wait minutes"
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <View style={styles.presets}>
                      {[5, 10, 15, 20, 30].map((minutes) => (
                        <TouchableOpacity key={minutes} style={styles.preset} onPress={() => setWaitMinutes(String(minutes))}>
                          <Text style={styles.presetText}>{minutes}m</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={styles.primaryButton} disabled={working} onPress={() => void orderUber(selected)}>
                      <Text style={styles.primaryText}>UBER ORDERED</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {selected.status === "uber_ordered" && selected.assignedToUserId === userId ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    disabled={working}
                    onPress={() => void completeStatus(selected, markHandedOff)}
                  >
                    <Text style={styles.primaryText}>PACKAGE HANDED OFF</Text>
                  </TouchableOpacity>
                ) : null}
                {selected.status === "handed_off" && selected.assignedToUserId === userId ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    disabled={working}
                    onPress={() => void completeStatus(selected, markDelivered)}
                  >
                    <Text style={styles.primaryText}>MARK DELIVERED</Text>
                  </TouchableOpacity>
                ) : null}
                {canCancel && selected.status !== "delivered" && selected.status !== "canceled" ? (
                  <>
                    <TextInput
                      style={styles.waitInput}
                      value={cancellationReason}
                      onChangeText={setCancellationReason}
                      placeholder="Cancellation reason"
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.destructiveButton}
                      disabled={working || cancellationReason.trim().length < 3}
                      onPress={() =>
                        void perform(async () => {
                          await cancelDelivery({
                            deliveryId: selected._id,
                            reason: cancellationReason.trim(),
                          });
                          if (businessId && userId) {
                            await clearLocalDeliveryNotifications(businessId, userId, selected._id);
                          }
                          setCancellationReason("");
                        })
                      }
                    >
                      <Text style={styles.destructiveText}>CANCEL DELIVERY</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity style={styles.cancel} onPress={() => {
                  setRevealedAddress(null);
                  setCancellationReason("");
                  setSelected(null);
                }}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: SPACING.lg },
  eyebrow: { color: COLORS.accent, fontSize: FONT_SIZES.xs, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xxl, fontWeight: "800" },
  assignmentText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginTop: SPACING.xs },
  connection: { color: COLORS.success, fontSize: FONT_SIZES.xs, fontWeight: "800" },
  offline: { color: COLORS.warning },
  loading: { flex: 1 },
  list: { gap: SPACING.sm, padding: SPACING.md, paddingBottom: 120 },
  empty: { color: COLORS.textMuted, padding: SPACING.xl, textAlign: "center" },
  card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, gap: SPACING.sm, padding: SPACING.md },
  overdueCard: { borderColor: COLORS.warning },
  cardHeading: { flexDirection: "row", gap: SPACING.sm, justifyContent: "space-between" },
  order: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: "800" },
  status: { color: COLORS.accent, fontSize: 10, fontWeight: "900" },
  overdueText: { color: COLORS.warning },
  address: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  meta: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  backdrop: { backgroundColor: "rgba(0,0,0,0.72)", flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, maxHeight: "82%" },
  sheetContent: { gap: SPACING.md, padding: SPACING.lg, paddingBottom: 36 },
  waitInput: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, borderWidth: 1, color: COLORS.text, padding: SPACING.md },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  preset: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  presetText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  primaryButton: { alignItems: "center", backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  primaryText: { color: COLORS.background, fontSize: FONT_SIZES.sm, fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderColor: COLORS.accent, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md },
  secondaryText: { color: COLORS.accent, fontSize: FONT_SIZES.sm, fontWeight: "900" },
  destructiveButton: { alignItems: "center", borderColor: COLORS.error, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md },
  destructiveText: { color: COLORS.error, fontSize: FONT_SIZES.sm, fontWeight: "900" },
  cancel: { alignItems: "center", padding: SPACING.md },
  cancelText: { color: COLORS.textSecondary },
});
