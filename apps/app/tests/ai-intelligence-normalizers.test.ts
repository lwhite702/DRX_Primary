import { describe, expect, it } from "vitest";

import {
  inventoryNumber,
  inventoryText,
  processedCount,
  unwrapApiData,
} from "@/lib/ai/intelligence-normalizers";

describe("AI intelligence payload normalization", () => {
  it("accepts snake_case and camelCase inventory prices", () => {
    expect(inventoryNumber({ unit_cost: "12.50" }, "unit_cost", "unitCost")).toBe(12.5);
    expect(inventoryNumber({ sellingPrice: 20 }, "selling_price", "sellingPrice")).toBe(20);
    expect(inventoryNumber({ unitCost: "bad" }, "unit_cost", "unitCost")).toBe(0);
    expect(inventoryText(null)).toBe("");
  });

  it("unwraps direct and nested API data", () => {
    expect(unwrapApiData<{ pricing: string }>({ data: { pricing: "direct" } })).toEqual({ pricing: "direct" });
    expect(unwrapApiData<{ pricing: string }>({ data: { data: { pricing: "nested" } } })).toEqual({ pricing: "nested" });
  });

  it("reads processed counts from supported response shapes", () => {
    expect(processedCount({ summary: { processed_count: 3 } })).toBe(3);
    expect(processedCount({ data: { summary: { processedCount: 4 } } })).toBe(4);
    expect(processedCount(null)).toBe(0);
  });
});
