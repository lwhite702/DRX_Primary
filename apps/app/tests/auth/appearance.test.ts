import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  drxClerkAuthAppearance,
  drxClerkWaitlistAppearance,
} from "@/lib/adapters/auth/appearance";

const workspaceStyles = resolve(process.cwd(), "apps/app/app/globals.css");
const globalStyles = readFileSync(
  existsSync(workspaceStyles) ? workspaceStyles : resolve(process.cwd(), "app/globals.css"),
  "utf8",
);

function cssRule(selectors: string, occurrence = 0) {
  let ruleStart = -1;

  for (let index = 0; index <= occurrence; index += 1) {
    ruleStart = globalStyles.indexOf(selectors, ruleStart + 1);
  }

  const ruleEnd = globalStyles.indexOf("}", ruleStart);

  if (ruleStart === -1 || ruleEnd === -1) {
    throw new Error(`Expected to find CSS rule for ${selectors}`);
  }

  return globalStyles.slice(ruleStart, ruleEnd);
}

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

    expect(inputClasses).toContain("bg-[#171717]");
    expect(inputClasses).toContain("border-[#555555]");
    expect(contrastRatio("#555555", "#0A0A0A")).toBeGreaterThanOrEqual(2.5);

    const waitlistClasses = drxClerkWaitlistAppearance.elements.formFieldInput;
    expect(waitlistClasses).toContain("bg-[#262626]");
    expect(waitlistClasses).toContain("border-[#737373]");
    expect(contrastRatio("#737373", "#121212")).toBeGreaterThanOrEqual(3);
  });

  it("keeps entered text legible against the field background", () => {
    expect(drxClerkAuthAppearance.variables.colorInputBackground).toBe("#262626");
    expect(drxClerkAuthAppearance.variables.colorInputText).toBe("#FFFFFF");
    expect(contrastRatio("#FFFFFF", "#262626")).toBeGreaterThanOrEqual(4.5);
  });

  it("uses dark, readable type on the lime primary button", () => {
    const buttonRule = cssRule(
      ".cl-formButtonPrimary,\n.cl-formButtonPrimary:hover,\n.cl-formButtonPrimary:focus,\n.cl-formButtonPrimary:active {",
    );

    expect(drxClerkAuthAppearance.variables.colorPrimaryForeground).toBe("#0A0A0A");
    expect(drxClerkAuthAppearance.elements.formButtonPrimary).toContain("text-[15px]");
    expect(drxClerkWaitlistAppearance.elements.formButtonPrimary).toContain("text-base");
    expect(buttonRule).toContain("color: #0a0a0a !important;");
    expect(buttonRule).toContain("font-size: 1rem !important;");
    expect(contrastRatio("#0A0A0A", "#CCFF00")).toBeGreaterThanOrEqual(7);
  });

  it("keeps global Clerk overrides aligned with the accessible auth theme", () => {
    const baseRule = cssRule(
      ".cl-formFieldInput,\n.cl-input,\n.cl-otpCodeFieldInput {",
      1,
    );
    const hoverRule = cssRule(".cl-formFieldInput:hover,\n.cl-input:hover {");
    const focusRule = cssRule(
      ".cl-formFieldInput:focus,\n.cl-input:focus,\n.cl-otpCodeFieldInput:focus {",
    );
    const placeholderRule = cssRule(
      ".cl-formFieldInput::placeholder,\n.cl-input::placeholder {",
    );

    expect(baseRule).toContain("background-color: #262626 !important;");
    expect(baseRule).toContain("border: 1px solid #737373 !important;");
    expect(hoverRule).toContain("border-color: #8a8a8a !important;");
    expect(focusRule).toContain("background-color: #2c2c2c !important;");
    expect(placeholderRule).toContain("color: #b3b3b3 !important;");
  });

  it("defines standard layout options without invalid theme properties", () => {
    expect("theme" in drxClerkAuthAppearance).toBe(false);
    expect(drxClerkAuthAppearance.layout.socialButtonsPlacement).toBe("bottom");
    expect(drxClerkAuthAppearance.layout.showOptionalFields).toBe(false);
  });
});
