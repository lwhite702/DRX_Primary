import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessDetailsStep } from "@/components/onboarding/steps/BusinessDetailsStep";
import type { BusinessSetupFormData } from "@/components/onboarding/types";

const formData: BusinessSetupFormData = {
  businessName: "",
  businessType: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  ownerName: "",
  ownerPhone: "",
  defaultUnit: "g",
  quickQuantities: [],
  privacyPreset: "standard_mode",
  enableManager: true,
  enableBudtender: true,
  enableInventoryStart: false,
  inventoryReasons: [],
  nicknames: [],
};

describe("business setup field contrast", () => {
  it("gives text fields and the business-type picker a distinct dark surface and visible border", () => {
    render(
      <BusinessDetailsStep formData={formData} setFormData={vi.fn()} />,
    );

    const businessName = screen.getByPlaceholderText("e.g. The Green Room");
    const businessType = screen.getByRole("combobox");

    for (const field of [businessName, businessType]) {
      expect(field).toHaveClass("bg-[#262626]");
      expect(field).toHaveClass("border-white/40");
      expect(field).toHaveClass("text-white");
    }
  });
});
