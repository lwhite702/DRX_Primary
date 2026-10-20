import { describe, expect, it } from "vitest";
import {
  effectiveUnitPriceCents,
  formatQuantity,
  LEGACY_FRACTIONAL_QUANTITY_CONFIG,
  lineTotalCents,
  normalizeQuantity,
  pricedLineTotalCents,
  resolveLoyaltyEligibleSpendCents,
  resolveLoyaltyRateBps,
  suggestedQuantityForDollars,
  parseDollarAmountCents,
  generateSafeOrderNumber,
  safeDisplayOrderNumber,
  type FractionalProduct,
} from "./checkoutMath";
import { parseDeliveryPushPayload } from "./pushNotifications";
import {
  buildDeliveryReminderSchedule,
  captureReminderPersistenceWarning,
  nextOverdueReminder,
  nextUnreadDeliveryNotification,
  shouldClearLocalDeliveryReminders,
  staleDeliveryReminderSchedule,
} from "./deliveryReminders";
import {
  hasNormalizedOfflineQuantityConfig,
  validateOfflineSaleQuantities,
} from "./offlineSaleValidation";

const product: FractionalProduct = {
  sellingPriceCents: 625,
  sellingUnit: "g",
  quantityPrecision: 2,
  minimumSaleQuantity: 0.1,
  quantityIncrement: 0.05,
  bulkPriceTiers: [{ minimumQuantity: 3.5, unitPriceCents: 500 }],
};

describe("fractional checkout math", () => {
  it("converts dollar strings to cents without binary float rounding errors", () => {
    expect(parseDollarAmountCents("1.005")).toBe(101);
    expect(parseDollarAmountCents("25")).toBe(2_500);
    expect(parseDollarAmountCents("0.004")).toBe(null);
  });
  it("previews exact bundle totals", () => {
    const bundled = { ...product, sellingPriceCents: 3_500, bulkPriceTiers: [
      { minimumQuantity: 2, unitPriceCents: 3_000, bundlePriceCents: 6_000 },
      { minimumQuantity: 3.5, unitPriceCents: 2_571, bundlePriceCents: 9_000 },
      { minimumQuantity: 7, unitPriceCents: 2_000, bundlePriceCents: 14_000 },
    ] };
    expect([2, 3.5, 7].map(quantity => lineTotalCents(bundled, quantity))).toEqual([6_000, 9_000, 14_000]);
  });
  it("formats display quantities to two decimals without changing calculation precision", () => {
    const precise = { ...product, quantityPrecision: 6, minimumSaleQuantity: 0.000001, quantityIncrement: 0.000001 };
    const quantity = normalizeQuantity(precise, 1.234567, 10);
    expect(quantity).toBe(1.234567);
    expect(formatQuantity(precise, quantity)).toBe("1.23g");
    expect(quantity).toBe(1.234567);
    expect(lineTotalCents({ ...precise, sellingPriceCents: 1000000 }, quantity)).toBe(1234567);
    expect(formatQuantity({ ...product, quantityPrecision: 0, sellingUnit: "unit" }, 2)).toBe("2.00unit");
    expect(formatQuantity(product, 1e21)).toBe("1000000000000000000000.00g");
  });

  it("normalizes displayed negative zero and marks nonfinite quantities unavailable", () => {
    expect(formatQuantity(product, -0)).toBe("0.00g");
    expect(formatQuantity(product, -0.000001)).toBe("0.00g");
    expect(formatQuantity(product, -1.25)).toBe("-1.25g");
    for (const quantity of [NaN, Infinity, -Infinity]) expect(formatQuantity(product, quantity)).toBe("—");
  });
  it("converts reciprocal dollar input and respects increments", () => {
    expect(suggestedQuantityForDollars(product, 1_000, 100)).toBe(1.6);
    expect(lineTotalCents(product, 1.6)).toBe(1_000);
    expect(normalizeQuantity(product, 0.03, 100)).toBe(0.1);
  });

  it("anchors quantity increments at the configured minimum", () => {
    const anchored = {
      ...product,
      minimumSaleQuantity: 0.1,
      quantityIncrement: 0.25,
    };
    expect(normalizeQuantity(anchored, 0.1, 100)).toBe(0.1);
    expect(normalizeQuantity(anchored, 0.25, 100)).toBe(0.35);
    expect(normalizeQuantity(anchored, 0.9, 0.8)).toBe(0.6);
  });

  it("selects the active bulk tier and rounds the line once", () => {
    expect(effectiveUnitPriceCents(product, 3.49)).toBe(625);
    expect(effectiveUnitPriceCents(product, 3.5)).toBe(500);
    expect(lineTotalCents(product, 3.55)).toBe(1_775);
  });

  it("applies loyalty after bulk for stacking and chooses best otherwise", () => {
    expect(resolveLoyaltyRateBps(20_000, [
      { minimumSpendCents: 0, discountRateBps: 100 },
      { minimumSpendCents: 10_000, discountRateBps: 1_000 },
    ])).toBe(1_000);
    expect(pricedLineTotalCents(product, 4, 1_000, "stack")).toBe(1_800);
    expect(pricedLineTotalCents(product, 4, 1_000, "best_only")).toBe(2_000);
  });

  it("uses loyalty-eligible spend and falls back for legacy customer records", () => {
    expect(resolveLoyaltyEligibleSpendCents({
      totalPurchasesCents: 25_000,
      loyaltyEligibleSpendCents: 10_000,
    })).toBe(10_000);
    expect(resolveLoyaltyEligibleSpendCents({ totalPurchasesCents: 25_000 })).toBe(25_000);
  });

  it("uses the backend's exact normalized defaults for legacy fractional products", () => {
    const legacy = { sellingPriceCents: 100, allowFractionalWeight: true };
    expect(LEGACY_FRACTIONAL_QUANTITY_CONFIG).toEqual({
      sellingUnit: "unit",
      quantityPrecision: 6,
      minimumSaleQuantity: 0.000001,
      quantityIncrement: 0.000001,
    });
    expect(normalizeQuantity(legacy, 0.000001, 1)).toBe(0.000001);
    expect(formatQuantity(legacy, 0.000001)).toBe("0.00unit");
  });
});

describe("minimized delivery push payload", () => {
  it("routes only the canonical data contract", () => {
    expect(parseDeliveryPushPayload({
      type: "delivery_reminder",
      outboxId: "outbox_1",
      notificationId: "notification_1",
      deliveryId: "delivery_1",
      kind: "eta_warning",
      scheduledFor: "1900000",
      route: "deliveries",
    })).toEqual({
      type: "delivery_reminder",
      outboxId: "outbox_1",
      notificationId: "notification_1",
      deliveryId: "delivery_1",
      kind: "eta_warning",
      scheduledFor: 1_900_000,
      route: "deliveries",
    });
  });

  it("rejects malformed or non-delivery routes", () => {
    expect(parseDeliveryPushPayload({ type: "delivery_reminder", route: "customers" })).toBeNull();
    expect(parseDeliveryPushPayload(null)).toBeNull();
  });
});

describe("delivery reminder cadence", () => {
  it("schedules T-2, ETA, and the first five-minute overdue reminder", () => {
    expect(buildDeliveryReminderSchedule(1_900_000)).toEqual([
      { kind: "eta_warning", scheduledAt: 1_780_000 },
      { kind: "eta_due", scheduledAt: 1_900_000 },
      { kind: "overdue", scheduledAt: 2_200_000 },
    ]);
  });

  it("advances acknowledged overdue reminders by five minutes", () => {
    const next = nextOverdueReminder(
      {
        deliveryId: "delivery_1",
        businessId: "business_1",
        userId: "user_1",
        orderNumber: "ORD-1",
        kind: "overdue",
        scheduledAt: 1_000_000,
      },
      1_100_000,
    );
    expect(next.scheduledAt).toBe(1_400_000);
    expect(next.acknowledgedAt).toBeUndefined();
  });

  it("uses the absolute server ETA without adding a second client wait", () => {
    const eta = 1_000_000 + 1_440 * 60_000;
    expect(buildDeliveryReminderSchedule(eta)[1]).toEqual({
      kind: "eta_due",
      scheduledAt: eta,
    });
    expect(() => buildDeliveryReminderSchedule(0)).toThrow(
      "INVALID_DELIVERY_ESTIMATED_ARRIVAL",
    );
  });

  it("identifies drifted schedules for replacement while preserving canonical acknowledgements", () => {
    const expected = buildDeliveryReminderSchedule(1_900_000);
    expect(staleDeliveryReminderSchedule([
      ...expected,
      { kind: "eta_due", scheduledAt: 1_900_500 },
      { kind: "overdue", scheduledAt: 2_200_500 },
    ], expected)).toEqual([
      { kind: "eta_due", scheduledAt: 1_900_500 },
      { kind: "overdue", scheduledAt: 2_200_500 },
    ]);
  });

  it("clears the old assignee's reminders after synchronized shift handoff", () => {
    expect(shouldClearLocalDeliveryReminders({
      status: "uber_ordered",
      assignedToUserId: "operator_2",
    }, "operator_1")).toBe(true);
    expect(shouldClearLocalDeliveryReminders({
      status: "uber_ordered",
      assignedToUserId: "operator_1",
    }, "operator_1")).toBe(false);
  });

  it("advances from the oldest unread reminder after durable server acknowledgement", () => {
    const first = { _id: "notification_1", createdAt: 1_000 };
    const second = { _id: "notification_2", createdAt: 2_000 };
    expect(nextUnreadDeliveryNotification([second, first])?._id).toBe(first._id);
    // The acknowledged row is absent from the next server-backed unread result.
    expect(nextUnreadDeliveryNotification([second])?._id).toBe(second._id);
  });

  it("reports post-commit reminder persistence as a warning without throwing", async () => {
    await expect(
      captureReminderPersistenceWarning(async () => {
        throw new Error("SQLITE_WRITE_FAILED");
      }),
    ).resolves.toBe("SQLITE_WRITE_FAILED");
    await expect(
      captureReminderPersistenceWarning(async () => undefined),
    ).resolves.toBeNull();
  });
});

describe("offline fractional quantity validation", () => {
  const item = { productId: "product_1", quantityGrams: 1.25, unitPriceCents: 100 };
  const configuredProduct = {
    _id: "product_1",
    allowFractionalWeight: true,
    quantityPrecision: 2,
    minimumSaleQuantity: 0.25,
    quantityIncrement: 0.25,
  };

  it("accepts quantities that satisfy precision, minimum, and increment", () => {
    expect(() => validateOfflineSaleQuantities([item], [configuredProduct])).not.toThrow();
  });

  it("anchors fractional increments at the exact minimum", () => {
    const anchoredProduct = {
      ...configuredProduct,
      minimumSaleQuantity: 0.1,
      quantityIncrement: 0.25,
    };
    expect(() => validateOfflineSaleQuantities([
      { ...item, quantityGrams: 0.1 },
      { ...item, quantityGrams: 0.35 },
    ], [anchoredProduct])).not.toThrow();
    expect(() => validateOfflineSaleQuantities([
      { ...item, quantityGrams: 0.25 },
    ], [anchoredProduct])).toThrow("OFFLINE_QUANTITY_INCREMENT_INVALID");
  });

  it("fails closed when fractional configuration is unavailable", () => {
    expect(() => validateOfflineSaleQuantities([item], [{
      _id: "product_1",
      allowFractionalWeight: true,
    }])).toThrow("OFFLINE_PRODUCT_QUANTITY_CONFIG_UNAVAILABLE");
  });

  it("rejects invalid precision, minimum, and increment before sync", () => {
    expect(() => validateOfflineSaleQuantities([
      { ...item, quantityGrams: 1.251 },
    ], [configuredProduct])).toThrow("OFFLINE_QUANTITY_PRECISION_INVALID");
    expect(() => validateOfflineSaleQuantities([
      { ...item, quantityGrams: 0.1 },
    ], [configuredProduct])).toThrow("OFFLINE_QUANTITY_BELOW_MINIMUM");
    expect(() => validateOfflineSaleQuantities([
      { ...item, quantityGrams: 1.1 },
    ], [configuredProduct])).toThrow("OFFLINE_QUANTITY_INCREMENT_INVALID");
  });

  it("honors configured minimum and increment for non-fractional products", () => {
    const wholeUnitProduct = {
      _id: "product_1",
      allowFractionalWeight: false,
      quantityPrecision: 0,
      minimumSaleQuantity: 2,
      quantityIncrement: 2,
    };
    expect(() => validateOfflineSaleQuantities([
      { ...item, quantityGrams: 2 },
    ], [wholeUnitProduct])).not.toThrow();
    expect(() => validateOfflineSaleQuantities([
      { ...item, quantityGrams: 3 },
    ], [wholeUnitProduct])).toThrow("OFFLINE_QUANTITY_INCREMENT_INVALID");
  });

  it("fails closed when normalized whole-unit configuration is unavailable", () => {
    expect(() => validateOfflineSaleQuantities([
      { ...item, quantityGrams: 1 },
    ], [{ _id: "product_1", allowFractionalWeight: false }])).toThrow(
      "OFFLINE_PRODUCT_QUANTITY_CONFIG_UNAVAILABLE",
    );
  });

  it("recognizes only normalized server quantity configuration for caching", () => {
    expect(hasNormalizedOfflineQuantityConfig(configuredProduct)).toBe(true);
    expect(hasNormalizedOfflineQuantityConfig({
      _id: "product_1",
      allowFractionalWeight: false,
      quantityPrecision: 0,
      minimumSaleQuantity: 1,
      quantityIncrement: 1,
    })).toBe(true);
    expect(hasNormalizedOfflineQuantityConfig({
      _id: "product_1",
      allowFractionalWeight: false,
    })).toBe(false);
  });

  it("generates safe 6-char base32 order numbers with ORD- prefix", () => {
    const generated = generateSafeOrderNumber();
    expect(generated).toMatch(/^ORD-[0-9A-Z]{6}$/);
  });

  it("formats long UUID and raw timestamp order numbers safely", () => {
    // Already safe 6-char
    expect(safeDisplayOrderNumber("ORD-489201")).toBe("ORD-489201");

    // Long UUID order number (user screenshot)
    expect(
      safeDisplayOrderNumber("ORD-69397A70-E49C-4AC6-B71E-E5430730C450"),
    ).toBe("ORD-69397A");
    expect(
      safeDisplayOrderNumber("ORD-260726A5-4234-482C-8DF4-ED77AD0098E8"),
    ).toBe("ORD-260726");

    // Raw timestamps
    expect(safeDisplayOrderNumber("DRX-A-1728445123456")).toBe("ORD-123456");
    expect(safeDisplayOrderNumber("WEB-1728445123")).toBe("ORD-445123");

    // Concise order numbers preserved
    expect(safeDisplayOrderNumber("ORD-100")).toBe("ORD-100");
    expect(safeDisplayOrderNumber("DRX-101")).toBe("DRX-101");
  });
});
