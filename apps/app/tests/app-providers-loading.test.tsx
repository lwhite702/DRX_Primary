import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hold optional onboarding assets pending, as on a cold mobile page load.
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/providers/business-setup-provider", () => ({ BusinessSetupProvider: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("@/lib/hooks/use-business", () => ({ BusinessProvider: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("@/components/providers/customer-provider", () => ({ CustomerProvider: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("@/components/providers/offline-provider", () => ({ OfflineProvider: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("@/components/providers/onboarding-provider", () => ({ OnboardingProvider: ({ children }: React.PropsWithChildren) => <>{children}</> }));

import { AppProviders } from "@/components/providers";

describe("app provider loading", () => {
  afterEach(() => { cleanup(); window.localStorage.removeItem("drx_onboarding_complete"); });

  it("keeps the route visible while optional onboarding UI loads", () => {
    window.localStorage.removeItem("drx_onboarding_complete");
    render(<AppProviders><main>Knowledge Library</main></AppProviders>);
    expect(screen.getByRole("main")).toHaveTextContent("Knowledge Library");
  });

  it("retains the completed-onboarding path", () => {
    window.localStorage.setItem("drx_onboarding_complete", "true");
    render(<AppProviders><main>Knowledge Library</main></AppProviders>);
    expect(screen.getByRole("main")).toHaveTextContent("Knowledge Library");
  });
});
