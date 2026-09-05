import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingCompletionRedirect } from "@/app/onboarding/_components/OnboardingForm";

describe("OnboardingCompletionRedirect", () => {
  it("syncs legacy state and performs a hard sale-workspace navigation", async () => {
    const storage = { setItem: vi.fn() };
    const navigate = vi.fn();

    render(
      <OnboardingCompletionRedirect
        completed
        storage={storage}
        navigate={navigate}
      />,
    );

    await waitFor(() => {
      expect(storage.setItem).toHaveBeenCalledWith(
        "drx_onboarding_complete",
        "true",
      );
      expect(navigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("still navigates when browser storage is blocked", async () => {
    const storage = {
      setItem: vi.fn(() => {
        throw new DOMException("Storage blocked", "SecurityError");
      }),
    };
    const navigate = vi.fn();

    render(
      <OnboardingCompletionRedirect
        completed
        storage={storage}
        navigate={navigate}
      />,
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/dashboard");
    });
  });
});
