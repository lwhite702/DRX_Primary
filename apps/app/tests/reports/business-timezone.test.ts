import { describe, expect, it } from "vitest";
import {
  businessDateKey,
  businessDayBounds,
  shiftDateKey,
} from "../../convex/helpers/businessTimezone";

describe("business-local reporting dates", () => {
  it("uses 23-hour days when daylight saving starts", () => {
    const bounds = businessDayBounds("2026-03-08", "America/New_York");

    expect(new Date(bounds.startAt).toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(new Date(bounds.endAt).toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(bounds.endAt - bounds.startAt).toBe(23 * 60 * 60 * 1_000);
  });

  it("uses 25-hour days when daylight saving ends", () => {
    const bounds = businessDayBounds("2026-11-01", "America/New_York");

    expect(new Date(bounds.startAt).toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(new Date(bounds.endAt).toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(bounds.endAt - bounds.startAt).toBe(25 * 60 * 60 * 1_000);
  });

  it("keeps calendar date keys independent from the device timezone", () => {
    expect(businessDateKey(new Date("2026-03-09T03:59:59.999Z"), "America/New_York")).toBe("2026-03-08");
    expect(businessDateKey(new Date("2026-03-09T04:00:00.000Z"), "America/New_York")).toBe("2026-03-09");
    expect(shiftDateKey("2026-03-08", 1)).toBe("2026-03-09");
  });

  it("rejects invalid business dates and timezones instead of returning UTC totals", () => {
    expect(() => businessDayBounds("2026-02-30", "America/New_York")).toThrow("calendar day");
    expect(() => businessDayBounds("2026-03-08", "Not/A_Timezone")).toThrow("Business timezone is invalid");
  });
});
