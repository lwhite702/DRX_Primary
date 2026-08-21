import { describe, expect, it } from "vitest";
import SalesHistoryPage from "@/app/(app)/sales/page";

describe("sales history page", () => {
  it("exports SalesHistoryPage component for order and sales history", () => {
    expect(SalesHistoryPage).toBeTypeOf("function");
  });
});
