import * as Notifications from "expo-notifications";
import type { DeliveryReminderKind, LocalDeliveryReminder } from "../offline/types";
import {
  clearDeliveryReminders,
  reconcileDeliveryReminders,
  replaceDeliveryReminders,
} from "../offline/database";
import {
  futureDeliveryReminderSchedule,
  localDeliveryNotificationIdentifier,
} from "./deliveryReminders";

const REMINDER_KINDS: DeliveryReminderKind[] = ["eta_warning", "eta_due", "overdue"];

type ScheduledReminder = Pick<
  LocalDeliveryReminder,
  "kind" | "scheduledAt" | "notificationIdentifier"
>;

export async function cancelLocalDeliveryNotifications(deliveryId: string) {
  await Promise.all(
    REMINDER_KINDS.map((kind) =>
      Notifications.cancelScheduledNotificationAsync(
        localDeliveryNotificationIdentifier(deliveryId, kind),
      ).catch(() => undefined),
    ),
  );
}

async function scheduleLocalDeliveryNotifications(
  deliveryId: string,
  reminders: Pick<LocalDeliveryReminder, "kind" | "scheduledAt">[],
): Promise<ScheduledReminder[]> {
  await cancelLocalDeliveryNotifications(deliveryId);
  const scheduled: ScheduledReminder[] = [];
  try {
    for (const reminder of futureDeliveryReminderSchedule(reminders)) {
      const identifier = localDeliveryNotificationIdentifier(deliveryId, reminder.kind);
      const title = reminder.kind === "eta_warning"
        ? "Courier arriving soon"
        : reminder.kind === "eta_due"
          ? "Courier wait time reached"
          : "Delivery handoff overdue";
      const notificationIdentifier = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body: "A delivery needs your attention.",
          sound: "default",
          data: {
            type: "local_delivery_reminder",
            deliveryId,
            kind: reminder.kind,
            scheduledFor: reminder.scheduledAt,
            route: "deliveries",
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.scheduledAt,
          channelId: "delivery-reminders",
        },
      });
      scheduled.push({
        ...reminder,
        notificationIdentifier,
      });
    }
    return scheduled;
  } catch (error) {
    await cancelLocalDeliveryNotifications(deliveryId);
    throw error;
  }
}

export async function replaceLocalDeliveryNotifications(input: {
  businessId: string;
  userId: string;
  deliveryId: string;
  orderNumber: string;
  reminders: Pick<LocalDeliveryReminder, "kind" | "scheduledAt">[];
}) {
  const scheduled = await scheduleLocalDeliveryNotifications(input.deliveryId, input.reminders);
  try {
    await replaceDeliveryReminders(
      input.businessId,
      input.userId,
      input.deliveryId,
      input.orderNumber,
      scheduled,
    );
  } catch (error) {
    await cancelLocalDeliveryNotifications(input.deliveryId);
    throw error;
  }
}

export async function reconcileLocalDeliveryNotifications(input: {
  businessId: string;
  userId: string;
  deliveryId: string;
  orderNumber: string;
  reminders: Pick<LocalDeliveryReminder, "kind" | "scheduledAt">[];
}) {
  const scheduled = await scheduleLocalDeliveryNotifications(input.deliveryId, input.reminders);
  try {
    await reconcileDeliveryReminders(
      input.businessId,
      input.userId,
      input.deliveryId,
      input.orderNumber,
      scheduled,
    );
  } catch (error) {
    await cancelLocalDeliveryNotifications(input.deliveryId);
    throw error;
  }
}

export async function clearLocalDeliveryNotifications(
  businessId: string,
  userId: string,
  deliveryId: string,
) {
  await cancelLocalDeliveryNotifications(deliveryId);
  await clearDeliveryReminders(businessId, userId, deliveryId);
}
