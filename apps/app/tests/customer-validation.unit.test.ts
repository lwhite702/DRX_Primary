import { describe, expect, it } from "vitest";

import { customerSchema } from "@/lib/validations/schemas";

describe("customer schema validation", () => {
  const businessId = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts minimum payload with internal id only", () => {
    const result = customerSchema.safeParse({
      business_id: businessId,
    });

    expect(result.success).toBe(true);
  });

  it("accepts alias-only payload", () => {
    const result = customerSchema.safeParse({
      business_id: businessId,
      alias: "Walk-in 1",
    });

    expect(result.success).toBe(true);
  });

  it("accepts first_name without phone/email", () => {
    const result = customerSchema.safeParse({
      business_id: businessId,
      first_name: "Jordan",
    });

    expect(result.success).toBe(true);
  });

  it("normalizes empty strings to undefined", () => {
    const result = customerSchema.safeParse({
      business_id: businessId,
      alias: "",
      first_name: "",
      phone_number: "",
      email: "",
      address: "",
      notes: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alias).toBeUndefined();
      expect(result.data.first_name).toBeUndefined();
      expect(result.data.phone_number).toBeUndefined();
      expect(result.data.email).toBeUndefined();
      expect(result.data.address).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects invalid email format", () => {
    const result = customerSchema.safeParse({
      business_id: businessId,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("rejects alias longer than 100 chars", () => {
    const result = customerSchema.safeParse({
      business_id: businessId,
      alias: "a".repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it("rejects phone longer than the supported 25 characters", () => {
    const result = customerSchema.safeParse({
      business_id: businessId,
      phone_number: "1".repeat(26),
    });

    expect(result.success).toBe(false);
  });
});
