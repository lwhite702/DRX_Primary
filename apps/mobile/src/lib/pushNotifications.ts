export type DeliveryPushPayload = {
  type: "delivery_reminder";
  outboxId: string;
  notificationId: string;
  deliveryId: string;
  kind: string;
  scheduledFor: number;
  route: "deliveries";
};

export type DeliveryPushCancellationPayload = {
  type: "delivery_reminder_canceled";
  outboxId: string;
  notificationId: string;
  deliveryId: string;
  reason: "assignment_changed";
  route: "deliveries";
};

export type LocalDeliveryReminderPayload = {
  type: "local_delivery_reminder";
  deliveryId: string;
  kind: string;
  scheduledFor: number;
  route: "deliveries";
};

let pushSignOutCleanup: (() => Promise<void>) | null = null;

function stringField(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function parseDeliveryPushPayload(input: unknown): DeliveryPushPayload | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const outboxId = stringField(data.outboxId);
  const notificationId = stringField(data.notificationId);
  const deliveryId = stringField(data.deliveryId);
  const kind = stringField(data.kind);
  const scheduledFor = typeof data.scheduledFor === "number"
    ? data.scheduledFor
    : Number(data.scheduledFor);
  if (
    data.type !== "delivery_reminder" ||
    data.route !== "deliveries" ||
    !outboxId ||
    !notificationId ||
    !deliveryId ||
    !kind ||
    !Number.isFinite(scheduledFor) ||
    scheduledFor <= 0
  ) return null;
  return {
    type: "delivery_reminder",
    outboxId,
    notificationId,
    deliveryId,
    kind,
    scheduledFor,
    route: "deliveries",
  };
}

export function parseDeliveryPushCancellation(
  input: unknown,
): DeliveryPushCancellationPayload | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const outboxId = stringField(data.outboxId);
  const notificationId = stringField(data.notificationId);
  const deliveryId = stringField(data.deliveryId);
  if (
    data.type !== "delivery_reminder_canceled" ||
    data.reason !== "assignment_changed" ||
    data.route !== "deliveries" ||
    !outboxId ||
    !notificationId ||
    !deliveryId
  ) return null;
  return {
    type: "delivery_reminder_canceled",
    outboxId,
    notificationId,
    deliveryId,
    reason: "assignment_changed",
    route: "deliveries",
  };
}

export function parseLocalDeliveryReminderPayload(
  input: unknown,
): LocalDeliveryReminderPayload | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const deliveryId = stringField(data.deliveryId);
  const kind = stringField(data.kind);
  const scheduledFor = typeof data.scheduledFor === "number"
    ? data.scheduledFor
    : Number(data.scheduledFor);
  if (
    data.type !== "local_delivery_reminder" ||
    data.route !== "deliveries" ||
    !deliveryId ||
    !kind ||
    !Number.isFinite(scheduledFor) ||
    scheduledFor <= 0
  ) return null;
  return {
    type: "local_delivery_reminder",
    deliveryId,
    kind,
    scheduledFor,
    route: "deliveries",
  };
}

export function setPushSignOutCleanup(cleanup: (() => Promise<void>) | null) {
  pushSignOutCleanup = cleanup;
}

export async function unregisterPushBeforeSignOut() {
  try {
    await pushSignOutCleanup?.();
  } catch {
    // Signing out must still succeed when the device is offline. The server
    // replaces this device/provider binding on the next authenticated registration.
  }
}
