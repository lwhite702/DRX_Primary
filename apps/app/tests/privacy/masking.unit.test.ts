import { describe, expect, it } from "vitest";
import { maskAlias, maskSensitiveText, shouldMaskPii } from "@/lib/privacy/masking";

describe("privacy masking", () => {
  it("masks alias tokens", () => {
    expect(maskAlias("Big Mike")).toBe("B*** M***");
    expect(maskAlias("jay")).toBe("J***");
  });

  it("returns hidden marker for sensitive text", () => {
    expect(maskSensitiveText()).toBe("Hidden");
  });

  it("resolves masking by mode", () => {
    expect(shouldMaskPii("always_on", false, false)).toBe(true);
    expect(shouldMaskPii("manual", true, false)).toBe(true);
    expect(shouldMaskPii("manual", false, true)).toBe(false);
    expect(shouldMaskPii("pos_only", false, true)).toBe(true);
    expect(shouldMaskPii("pos_only", false, false)).toBe(false);
  });
});
