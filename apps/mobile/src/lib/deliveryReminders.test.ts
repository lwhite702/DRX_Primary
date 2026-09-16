import { describe, expect, it } from "vitest";
import {
  buildDeliveryReminderSchedule,
  captureReminderPersistenceWarning,
  futureDeliveryReminderSchedule,
  localDeliveryNotificationIdentifier,
  nextOverdueReminder,
  nextUnreadDeliveryNotification,
  shouldClearLocalDeliveryReminders,
  staleDeliveryReminderSchedule,
} from "./deliveryReminders";
import type { LocalDeliveryReminder } from "../offline/types";

describe("deliveryReminders", () => {
  const baseEta = 1_700_000_000_000;

  it("builds a delivery reminder schedule for T-2m, ETA, and T+5m overdue", () => {
    const schedule = buildDeliveryReminderSchedule(baseEta);
    expect(schedule).toHaveLength(3);
    expect(schedule[0]).toEqual({
      kind: "eta_warning",
      scheduledAt: baseEta - 2 * 60_000,
    });
    expect(schedule[1]).toEqual({
      kind: "eta_due",
      scheduledAt: baseEta,
    });
    expect(schedule[2]).toEqual({
      kind: "overdue",
      scheduledAt: baseEta + 5 * 60_000,
    });
  });

  it("throws on invalid or non-positive ETA timestamps", () => {
    expect(() => buildDeliveryReminderSchedule(0)).toThrow("INVALID_DELIVERY_ESTIMATED_ARRIVAL");
    expect(() => buildDeliveryReminderSchedule(-100)).toThrow("INVALID_DELIVERY_ESTIMATED_ARRIVAL");
    expect(() => buildDeliveryReminderSchedule(Number.NaN)).toThrow("INVALID_DELIVERY_ESTIMATED_ARRIVAL");
    expect(() => buildDeliveryReminderSchedule(1.5)).toThrow("INVALID_DELIVERY_ESTIMATED_ARRIVAL");
  });

  it("constructs deterministic notification identifiers", () => {
    expect(localDeliveryNotificationIdentifier("del-123", "eta_warning")).toBe(
      "drx.delivery.del-123.eta_warning",
    );
    expect(localDeliveryNotificationIdentifier("del-123", "eta_due")).toBe(
      "drx.delivery.del-123.eta_due",
    );
    expect(localDeliveryNotificationIdentifier("del-123", "overdue")).toBe(
      "drx.delivery.del-123.overdue",
    );
  });

  it("filters only future reminders based on given reference timestamp", () => {
    const reminders = [
      { kind: "eta_warning" as const, scheduledAt: baseEta - 2 * 60_000 },
      { kind: "eta_due" as const, scheduledAt: baseEta },
      { kind: "overdue" as const, scheduledAt: baseEta + 5 * 60_000 },
    ];
    // Reference at baseEta - 1 minute: warning is in the past, due and overdue in future
    const future = futureDeliveryReminderSchedule(reminders, baseEta - 60_000);
    expect(future).toHaveLength(2);
    expect(future[0].kind).toBe("eta_due");
    expect(future[1].kind).toBe("overdue");
  });

  it("determines when to clear local delivery reminders", () => {
    const currentUserId = "user_me";

    // Delivered or canceled deliveries should be cleared
    expect(
      shouldClearLocalDeliveryReminders(
        { status: "delivered", assignedToUserId: currentUserId },
        currentUserId,
      ),
    ).toBe(true);

    expect(
      shouldClearLocalDeliveryReminders(
        { status: "canceled", assignedToUserId: currentUserId },
        currentUserId,
      ),
    ).toBe(true);

    // Deliveries assigned to another operator should be cleared from this device
    expect(
      shouldClearLocalDeliveryReminders(
        { status: "uber_ordered", assignedToUserId: "user_other" },
        currentUserId,
      ),
    ).toBe(true);

    // Active deliveries assigned to current operator should NOT be cleared
    expect(
      shouldClearLocalDeliveryReminders(
        { status: "uber_ordered", assignedToUserId: currentUserId },
        currentUserId,
      ),
    ).toBe(false);

    expect(
      shouldClearLocalDeliveryReminders(
        { status: "ready_for_dispatch", assignedToUserId: currentUserId },
        currentUserId,
      ),
    ).toBe(false);
  });

  it("finds the earliest unread delivery notification", () => {
    const notifications = [
      { _id: "n2", createdAt: 200, message: "Second" },
      { _id: "n1", createdAt: 100, message: "First" },
      { _id: "n3", createdAt: 300, message: "Third" },
    ];
    const earliest = nextUnreadDeliveryNotification(notifications);
    expect(earliest?._id).toBe("n1");
  });

  it("identifies stale delivery reminders during reconciliation", () => {
    const existing = [
      { kind: "eta_warning" as const, scheduledAt: baseEta - 2 * 60_000 },
      { kind: "eta_due" as const, scheduledAt: baseEta },
      { kind: "overdue" as const, scheduledAt: baseEta + 5 * 60_000 },
    ];
    // New ETA moved 10 minutes forward
    const newBaseEta = baseEta + 10 * 60_000;
    const expected = [
      { kind: "eta_warning" as const, scheduledAt: newBaseEta - 2 * 60_000 },
      { kind: "eta_due" as const, scheduledAt: newBaseEta },
      { kind: "overdue" as const, scheduledAt: newBaseEta + 5 * 60_000 },
    ];
    const stale = staleDeliveryReminderSchedule(existing, expected);
    expect(stale).toHaveLength(3);
    expect(stale).toEqual(existing);
  });

  it("captures reminder persistence warnings safely", async () => {
    const successWarning = await captureReminderPersistenceWarning(async () => {
      // success
    });
    expect(successWarning).toBeNull();

    const failureWarning = await captureReminderPersistenceWarning(async () => {
      throw new Error("DISK_FULL");
    });
    expect(failureWarning).toBe("DISK_FULL");
  });

  it("creates next overdue reminder scheduled 5 minutes after acknowledgment", () => {
    const reminder: LocalDeliveryReminder = {
      deliveryId: "del-456",
      businessId: "biz-1",
      userId: "usr-1",
      orderNumber: "DRX-101",
      kind: "eta_due",
      scheduledAt: baseEta,
    };
    const ackTime = baseEta + 60_000;
    const next = nextOverdueReminder(reminder, ackTime);
    expect(next.kind).toBe("overdue");
    expect(next.scheduledAt).toBe(ackTime + 5 * 60_000);
    expect(next.acknowledgedAt).toBeUndefined();
  });
});
