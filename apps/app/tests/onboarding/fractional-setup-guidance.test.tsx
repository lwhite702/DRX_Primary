import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  result: { status: "idle", error: null } as Record<string, unknown>,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useActionState: () => [mocks.result, vi.fn(), false],
}));
vi.mock("@/lib/adapters/auth/ui", () => ({ useUser: () => ({ user: null }) }));
vi.mock("@wrelik/analytics/client", () => ({ capture: vi.fn() }));
vi.mock("@/app/onboarding/_actions", () => ({ completeOnboarding: vi.fn() }));
import { OnboardingForm } from "../../app/onboarding/_components/OnboardingForm";
import {
  createDraft,
  ONBOARDING_DRAFT_KEY,
} from "../../lib/onboarding/state-machine";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe("onboarding fractional setup guidance", () => {
  it("explains per-product fractional setup during inventory onboarding", async () => {
    mocks.result = { status: "idle", error: null };
    localStorage.setItem(
      ONBOARDING_DRAFT_KEY,
      JSON.stringify({ ...createDraft(), currentStep: "inventoryDecision" }),
    );
    render(<OnboardingForm />);
    expect(
      await screen.findByText(
        /set up products sold by weight or partial units/,
      ),
    ).toBeInTheDocument();
  });
  it("links the completion action directly to first-product creation", () => {
    mocks.result = {
      status: "success",
      summary: {
        businessType: "retail",
        businessName: "Synthetic store",
        ownerName: "Operator",
        locationName: "Location",
        currency: "USD",
        timezone: "America/New_York",
        taxEnabled: false,
        taxRateBps: 0,
        inventoryEnabled: true,
      },
    };
    render(<OnboardingForm />);
    expect(
      screen.getByRole("link", { name: "Add first product" }),
    ).toHaveAttribute("href", "/inventory?create=1");
    expect(
      screen.getByText(/Whole-unit selling stays the default/),
    ).toBeInTheDocument();
  });
});
