import { act, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  businessId: "business-a",
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "customer-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-business", () => ({
  useBusiness: () => ({
    business: { id: mocks.businessId },
    loading: false,
  }),
}));

vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({
    loading: false,
    hasPermission: () => false,
  }),
}));

vi.mock("@/components/credit/AICreditPanel", () => ({
  AICreditPanel: () => null,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), promise: vi.fn() },
}));

import CustomerDetailPage from "@/app/(app)/customers/[id]/page";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function response(body: unknown) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("customer detail business switching", () => {
  beforeEach(() => {
    mocks.businessId = "business-a";
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not publish a customer response from the previous business", async () => {
    const businessA = deferred<Response>();
    const businessB = deferred<Response>();
    mocks.fetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/customers/")) {
        return url.includes("business_id=business-a")
          ? businessA.promise
          : businessB.promise;
      }
      if (url.includes("/api/business/settings")) {
        return Promise.resolve(response({}));
      }
      return Promise.resolve(response({ manual_enabled: false }));
    });

    const rendered = render(<CustomerDetailPage />);
    mocks.businessId = "business-b";
    rendered.rerender(<CustomerDetailPage />);

    await act(async () => {
      businessB.resolve(
        response({
          id: "customer-1",
          alias: "Business B Customer",
          isActive: true,
          transaction_history: [],
        }),
      );
      await businessB.promise;
    });
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Business B Customer" }),
      ).toBeInTheDocument();
    });

    await act(async () => {
      businessA.resolve(
        response({
          id: "customer-1",
          alias: "Business A Customer",
          isActive: true,
          transaction_history: [],
        }),
      );
      await businessA.promise;
    });

    expect(screen.queryByText("Business A Customer")).not.toBeInTheDocument();
    expect(screen.getByText("Business B Customer")).toBeInTheDocument();
  });
});
