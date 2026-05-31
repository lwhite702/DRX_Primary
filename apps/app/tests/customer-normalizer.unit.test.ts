import { describe, expect, it } from "vitest";
import {
  customerMatchesSearch,
  mapCustomerToOperationalModel,
  normalizeAlias,
  normalizeCustomerSearchInput,
  normalizeEmail,
  normalizePhone,
} from "@/lib/customers/core/customer-normalizer";

describe("customer normalizer", () => {
  it("normalizes alias/phone/email for deterministic lookup", () => {
    expect(normalizeAlias("  J@ne   Doe  ")).toBe("jne doe");
    expect(normalizePhone("+1 (555) 123-4567")).toBe("5551234567");
    expect(normalizeEmail("  USER@EXAMPLE.COM ")).toBe("user@example.com");
  });

  it("matches deterministic search against normalized operational row", () => {
    const search = normalizeCustomerSearchInput("(555) 123-4567");
    expect(
      customerMatchesSearch(
        {
          alias: "VIP customer",
          first_name: "Jane",
          last_name: "Doe",
          phone: "+1 555 123 4567",
          email: "jane@example.com",
        },
        search,
      ),
    ).toBe(true);
  });

  it("maps operational model with dual-case compatibility fields", () => {
    const model = mapCustomerToOperationalModel(
      {
        id: "cust_1",
        businessId: "biz_1",
        lastName: "Doe",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        customerType: "retail",
        totalPurchases: 12.5,
        totalCreditUsed: 3,
        fixedPricePerGram: null,
        isActive: true,
        ephemeral: false,
        ephemeralExpiresAt: null,
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-02T00:00:00.000Z"),
        lastActivityAt: new Date("2026-05-03T00:00:00.000Z"),
      },
      {
        alias: "Jane",
        first_name: "Jane",
        phone: "5551234567",
        email: "jane@example.com",
        address: "123 Main",
        notes: "VIP",
      },
    );

    expect(model.alias).toBe("Jane");
    expect(model.first_name).toBe("Jane");
    expect(model.phone_number).toBe("5551234567");
    expect(model.total_purchases).toBe(12.5);
  });
});
