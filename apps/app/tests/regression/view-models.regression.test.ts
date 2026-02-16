import { describe, expect, it } from "vitest";

describe("Regression snapshots", () => {
  it("normalizes checkout totals model", () => {
    const model = {
      subtotal: 120.5,
      tax: 9.64,
      fees: [
        { type: "delivery", amount: 4.5 },
        { type: "service", amount: 1.25 },
      ],
      total: 135.89,
      paymentMethods: ["cash", "card", "credit"],
    };

    expect(model).toMatchInlineSnapshot(`
      {
        "fees": [
          {
            "amount": 4.5,
            "type": "delivery",
          },
          {
            "amount": 1.25,
            "type": "service",
          },
        ],
        "paymentMethods": [
          "cash",
          "card",
          "credit",
        ],
        "subtotal": 120.5,
        "tax": 9.64,
        "total": 135.89,
      }
    `);
  });
});
