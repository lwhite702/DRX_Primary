import { describe, expect, it } from "vitest";
import { posCheckoutSchema } from "@/lib/validations/schemas";

describe("Security validation guardrails", () => {
  it("rejects unsupported payment methods", () => {
    const result = posCheckoutSchema.safeParse({
      business_id: "b1",
      order_type: "retail",
      payment_method: "wire",
      line_items: [{ inventory_id: "i1", quantity: 1, unit_price: 1 }],
    });

    expect(result.success).toBe(false);
  });

  it("accepts allowed payment methods", () => {
    const result = posCheckoutSchema.safeParse({
      business_id: "b1",
      order_type: "retail",
      payment_method: "cash",
      line_items: [{ inventory_id: "i1", quantity: 1, unit_price: 1 }],
    });

    expect(result.success).toBe(true);
  });
});
