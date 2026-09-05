import type { DeliveryReminderKind, LocalDeliveryReminder } from "../offline/types";

export function buildDeliveryReminderSchedule(
  estimatedArrivalAt: number,
): { kind: DeliveryReminderKind; scheduledAt: number }[] {
  if (!Number.isSafeInteger(estimatedArrivalAt) || estimatedArrivalAt <= 0) {
    throw new Error("INVALID_DELIVERY_ESTIMATED_ARRIVAL");
  }
  return [
    { kind: "eta_warning", scheduledAt: estimatedArrivalAt - 2 * 60_000 },
    { kind: "eta_due", scheduledAt: estimatedArrivalAt },
    { kind: "overdue", scheduledAt: estimatedArrivalAt + 5 * 60_000 },
  ];
}

export function localDeliveryNotificationIdentifier(
  deliveryId: string,
  kind: DeliveryReminderKind,
) {
  return `drx.delivery.${deliveryId}.${kind}`;
}

export function futureDeliveryReminderSchedule<
  T extends Pick<LocalDeliveryReminder, "kind" | "scheduledAt">,
>(reminders: T[], now = Date.now()) {
  return reminders.filter((reminder) => reminder.scheduledAt > now);
}

type ReminderScheduleKey = Pick<LocalDeliveryReminder, "kind" | "scheduledAt">;

export function shouldClearLocalDeliveryReminders(
  delivery: { status: string; assignedToUserId?: string },
  currentUserId: string,
) {
  return (
    delivery.status === "delivered" ||
    delivery.status === "canceled" ||
    (Boolean(delivery.assignedToUserId) && delivery.assignedToUserId !== currentUserId)
  );
}

export function nextUnreadDeliveryNotification<T extends { createdAt: number }>(
  notifications: T[],
): T | undefined {
  return [...notifications].sort((left, right) => left.createdAt - right.createdAt)[0];
}

export function staleDeliveryReminderSchedule(
  existing: ReminderScheduleKey[],
  expected: ReminderScheduleKey[],
) {
  const expectedKeys = new Set(
    expected.map((reminder) => `${reminder.kind}:${reminder.scheduledAt}`),
  );
  return existing.filter(
    (reminder) => !expectedKeys.has(`${reminder.kind}:${reminder.scheduledAt}`),
  );
}

export async function captureReminderPersistenceWarning(
  persist: () => Promise<unknown>,
): Promise<string | null> {
  try {
    await persist();
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "LOCAL_REMINDER_PERSISTENCE_FAILED";
  }
}

export function nextOverdueReminder(
  reminder: LocalDeliveryReminder,
  acknowledgedAt: number,
): LocalDeliveryReminder {
  return {
    ...reminder,
    kind: "overdue",
    scheduledAt: acknowledgedAt + 5 * 60_000,
    acknowledgedAt: undefined,
  };
}
