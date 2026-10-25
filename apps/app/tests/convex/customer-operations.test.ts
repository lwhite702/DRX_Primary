import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as customers from "../../convex/customers";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";

const modules = {
  "customers.ts": async () => customers,
  "onboarding.ts": async () => onboarding,
  "_generated/api.js": async () => generated,
};

function customerArgs(businessId: string, expectedUserId: string, phoneHash = "phone-hash") {
  return {
    businessId, expectedUserId,
    aliasEncrypted: "v1:nonce:cipher", firstNameEncrypted: null, phoneEncrypted: "v1:nonce:phone",
    emailEncrypted: null, addressEncrypted: null, notesEncrypted: null,
    aliasHash: "alias-hash", phoneHash, emailHash: null, piiEncryptionVersion: 1,
    lastName: null, city: null, state: null, zipCode: null, customerType: "retail",
    fixedPricePerGramCents: 1250, creditLimitCents: 5000, ephemeral: false,
    ephemeralExpiresAt: null, isActive: true, changedFields: ["alias", "phone"],
  };
}

describe("Convex customer operations", () => {
  it("creates, lists, updates, audits, and isolates encrypted customer records", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "customer-owner" });
    const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
    const created = await owner.mutation(api.customers.createOperational, customerArgs(businessId, "customer-owner"));
    expect(created).toMatchObject({ businessId, aliasEncrypted: "v1:nonce:cipher", fixedPricePerGramCents: 1250, creditLimitCents: 5000 });
    expect(JSON.stringify(created)).not.toContain("Synthetic customer name");

    const listed = await owner.query(api.customers.listOperational, { businessId, expectedUserId: "customer-owner", isActive: true, windowSize: 50 });
    expect(listed.map(row => row._id)).toContain(created._id);

    await expect(owner.mutation(api.customers.createOperational, customerArgs(businessId, "customer-owner"))).rejects.toThrow("CONFLICT");
    const updated = await owner.mutation(api.customers.updateOperational, { ...customerArgs(businessId, "customer-owner", "new-phone-hash"), customerId: created._id, creditLimitCents: 7500, changedFields: ["credit_limit"] });
    expect(updated).toMatchObject({ creditLimitCents: 7500, phoneHash: "new-phone-hash" });

    const detail = await owner.query(api.customers.getOperational, { businessId, expectedUserId: "customer-owner", customerId: created._id });
    expect(detail).toMatchObject({ customer: { _id: created._id }, transactionHistory: [], metrics: { sales_all_time: 0, current_credit_balance: 0 } });
    const customerAudit = await t.run(ctx => ctx.db.query("auditEvents").withIndex("by_businessId", q => q.eq("businessId", businessId)).collect());
    expect(customerAudit.filter(event => event.entityType === "customer").map(event => event.action)).toEqual(["CUSTOMER_REGISTERED", "CUSTOMER_UPDATED"]);

    const other = t.withIdentity({ subject: "other-owner" });
    const foreign = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
    await expect(other.query(api.customers.getOperational, { businessId: foreign.businessId, expectedUserId: "other-owner", customerId: created._id })).rejects.toThrow("NOT_FOUND");
    await expect(owner.query(api.customers.listOperational, { businessId, expectedUserId: "forged", isActive: true, windowSize: 50 })).rejects.toThrow("FORBIDDEN");
  });

  it("supports multiple product custom pricing, alerts and notes, and title casing", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "customer-owner-2" });
    const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Dispensary 2" });

    // Test creating with customProductPrices and lowercase lastName (should be title-cased)
    const customPrices = [
      { productId: "prod-1", productName: "OG Kush", pricePerUnitCents: 1500 },
      { productId: "prod-2", productName: "Blue Dream", pricePerUnitCents: 1200 },
    ];
    const created = await owner.mutation(api.customers.createOperational, {
      ...customerArgs(businessId, "customer-owner-2", "phone-hash-multi"),
      lastName: "o'connor smith",
      customProductPrices: customPrices,
    });
    expect(created.lastName).toBe("O'Connor Smith");
    expect(created.customProductPrices).toEqual(customPrices);

    // Test adding an alert and a note
    const alertId = await owner.mutation(api.customers.addCustomerNoteOrAlert, {
      businessId,
      customerId: created._id,
      expectedUserId: "customer-owner-2",
      classification: "alert",
      message: "Customer prefers discrete packaging",
      severity: "warning",
      createdFrom: "customer_screen",
    });
    expect(alertId).toBeDefined();

    const noteId = await owner.mutation(api.customers.addCustomerNoteOrAlert, {
      businessId,
      customerId: created._id,
      expectedUserId: "customer-owner-2",
      classification: "note",
      message: "Referred by VIP customer Dan",
      severity: "info",
      createdFrom: "sale_screen",
    });
    expect(noteId).toBeDefined();

    // Query alerts and notes
    const queried = await owner.query(api.customers.getCustomerNotesAndAlerts, {
      businessId,
      customerId: created._id,
      expectedUserId: "customer-owner-2",
    });
    expect(queried.alerts).toHaveLength(1);
    expect(queried.alerts[0].message).toBe("Customer prefers discrete packaging");
    expect(queried.notes).toHaveLength(1);
    expect(queried.notes[0].message).toBe("Referred by VIP customer Dan");

    // Dismiss alert
    const dismissRes = await owner.mutation(api.customers.dismissCustomerAlert, {
      businessId,
      noteId: alertId,
      expectedUserId: "customer-owner-2",
    });
    expect(dismissRes.success).toBe(true);

    const queriedAfter = await owner.query(api.customers.getCustomerNotesAndAlerts, {
      businessId,
      customerId: created._id,
      expectedUserId: "customer-owner-2",
    });
    expect(queriedAfter.alerts).toHaveLength(0);
    expect(queriedAfter.notes).toHaveLength(1);
  });
});
