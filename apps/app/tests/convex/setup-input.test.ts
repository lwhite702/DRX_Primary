import { expect, it } from "vitest";
import { setupBusinessSchema } from "../../lib/onboarding/setup-schema";
const input = {
  businessName: " Synthetic store ", businessType: "retail", address: "", city: "", state: "", zipCode: "",
  ownerPhone: "", ownerName: "Synthetic operator", defaultUnit: "g", privacyPreset: "alias_mode",
  quickQuantities: [{ label: "Half", value: 0.5, unit: "g", enabled: true }],
  inventoryReasons: [{ label: "Damaged", type: "shrinkage", enabled: true }],
  nicknames: [{ slang: "Half", quantity: 0.5, unit: "g", enabled: true }],
};
it("preserves supported wizard settings including fractional quantities and privacy preset", () => {
  expect(setupBusinessSchema.parse(input)).toEqual({ ...input, businessName: "Synthetic store" });
});
it("rejects malformed provisioning data before any business can be created", () => {
  for (const patch of [
    { businessName: " " }, { ownerName: "" }, { privacyPreset: "Strict" },
    { ownerId: "another-operator" }, { quickQuantities: [{ ...input.quickQuantities[0], value: Infinity }] },
    { nicknames: [{ ...input.nicknames[0], quantity: -1 }] },
    { inventoryReasons: Array.from({ length: 101 }, () => input.inventoryReasons[0]) },
  ]) expect(setupBusinessSchema.safeParse({ ...input, ...patch }).success).toBe(false);
});
