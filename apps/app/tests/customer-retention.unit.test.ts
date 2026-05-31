import { describe, expect, it } from "vitest";
import { resolveCustomerLifecycleState } from "@/lib/customers/core/customer-retention";

describe("customer retention lifecycle", () => {
  it("prioritizes legal hold state", () => {
    expect(
      resolveCustomerLifecycleState({
        isActive: true,
        ephemeral: true,
        hasLegalHold: true,
      }),
    ).toBe("legal_hold");
  });

  it("maps ephemeral and active states deterministically", () => {
    expect(
      resolveCustomerLifecycleState({
        isActive: true,
        ephemeral: true,
        hasLegalHold: false,
      }),
    ).toBe("ephemeral_active");

    expect(
      resolveCustomerLifecycleState({
        isActive: true,
        ephemeral: false,
        hasLegalHold: false,
      }),
    ).toBe("active");
  });
});
