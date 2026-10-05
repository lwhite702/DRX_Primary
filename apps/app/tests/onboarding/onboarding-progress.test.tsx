import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OnboardingProvider } from "@/components/providers/onboarding-provider";
import { SetupGuide } from "@/components/onboarding/setup-guide";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("onboarding progress", () => {
  it("loads product completion for the active business", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/inventory")) {
        if (!(init?.headers as Record<string, string> | undefined)?.["x-business-id"]) {
          return response({ error: "Select a business" }, 400);
        }
        return response({ data: [{ id: "synthetic-product" }] });
      }
      if (url.startsWith("/api/customers")) return response({ data: [] });
      return response({
        today: { salesCount: 0 },
        week: { salesCount: 0 },
        recentSales: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <OnboardingProvider>
        <SetupGuide />
      </OnboardingProvider>,
    );

    await screen.findByText("50% Complete");
    expect(screen.getByText("Add your first product")).toHaveClass("line-through");
    const inventoryCall = fetchMock.mock.calls.find(([url]) =>
      String(url).startsWith("/api/inventory"),
    );
    expect(inventoryCall?.[1]).toMatchObject({
      credentials: "same-origin",
      headers: { "x-business-id": "test-business-id" },
    });
  });

  it("shows an actionable error instead of default completion when loading fails", async () => {
    let inventoryFails = true;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).startsWith("/api/inventory")) {
        return inventoryFails
          ? response({ error: "Select a business" }, 400)
          : response({ data: [{ id: "synthetic-product" }] });
      }
      if (String(input).startsWith("/api/customers")) return response({ data: [] });
      return response({ today: { salesCount: 0 }, week: { salesCount: 0 }, recentSales: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <OnboardingProvider>
        <SetupGuide />
      </OnboardingProvider>,
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Setup progress couldn’t be refreshed.",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText(/% Complete/)).not.toBeInTheDocument();

    inventoryFails = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("50% Complete");
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});
