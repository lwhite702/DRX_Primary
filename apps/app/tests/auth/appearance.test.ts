import { describe, expect, it } from "vitest";
import { drxClerkAuthAppearance } from "@/lib/adapters/auth/appearance";

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((channel) => channelToLinear(Number.parseInt(channel, 16)));

  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex color, received ${hex}`);
  }

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

describe("Clerk authentication appearance", () => {
  it("keeps unfocused form field boundaries distinguishable from the auth panel", () => {
    const inputClasses = drxClerkAuthAppearance.elements.formFieldInput;

    expect(inputClasses).toContain("bg-[#262626]");
    expect(inputClasses).toContain("border-[#737373]");
    expect(contrastRatio("#737373", "#121212")).toBeGreaterThanOrEqual(3);
  });

  it("keeps entered text legible against the field background", () => {
    expect(drxClerkAuthAppearance.variables.colorInputBackground).toBe("#262626");
    expect(drxClerkAuthAppearance.variables.colorInputText).toBe("#FFFFFF");
    expect(contrastRatio("#FFFFFF", "#262626")).toBeGreaterThanOrEqual(4.5);
  });
});
