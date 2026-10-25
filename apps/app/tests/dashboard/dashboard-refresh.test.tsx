import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardData } from "@/app/(app)/dashboard/_hooks/useDashboardData";

const report = {
  today: { salesTotal: 125, salesCount: 3, cashSales: 75, totalTax: 10, subtotal: 115, averageOrderValue: 41.67 },
  week: { salesTotal: 500, salesCount: 12 },
  previousWeek: { salesTotal: 400, salesCount: 10 },
  topProducts: [
    {
      id: "product-1",
      name: "Standard product",
      sku: "SKU-1",
      quantitySoldGrams: 2,
      revenue: 50,
    },
  ],
  todayTopProducts: [
    { id: "product-1", name: "Standard product", sku: "SKU-1", quantitySoldGrams: 2, revenue: 50 },
  ],
  lowStock: { count: 1, items: [] },
  credit: { outstandingBalance: 20, activeBalances: 1 },
  recentSales: [
    {
      id: "sale-1",
      total: 50,
      paymentMethod: "cash",
      customerId: "customer-1",
      createdAt: "2026-08-20T14:00:00.000Z",
    },
  ],
  latestAuditAt: "2026-08-20T13:55:00.000Z",
};

function response(body: unknown = report, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("useDashboardData refresh states", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps loaded values visible during a background refresh", async () => {
    fetchMock.mockResolvedValueOnce(response());
    const { result } = renderHook(() => useDashboardData("business-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats?.salesToday).toBe(125);

    const nextRequest = deferred<Response>();
    fetchMock.mockReturnValueOnce(nextRequest.promise);

    let refreshPromise!: Promise<void>;
    act(() => {
      refreshPromise = result.current.refresh();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.stats?.salesToday).toBe(125);

    await act(async () => {
      nextRequest.resolve(
        response({
          ...report,
          today: { ...report.today, salesTotal: 175 },
        }),
      );
      await refreshPromise;
    });

    expect(result.current.refreshing).toBe(false);
    expect(result.current.stats?.salesToday).toBe(175);
  });

  it("preserves the last good values and exposes a retryable refresh error", async () => {
    fetchMock.mockResolvedValueOnce(response());
    const { result } = renderHook(() => useDashboardData("business-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    fetchMock.mockResolvedValueOnce(response({}, false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.stats?.salesToday).toBe(125);
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.error).toBe("Couldn’t load today’s numbers. Try again.");
  });

  it("does not publish an aborted business request after a business switch", async () => {
    const firstRequest = deferred<Response>();
    const secondRequest = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const { result, rerender } = renderHook(
      ({ businessId }) => useDashboardData(businessId),
      { initialProps: { businessId: "business-1" } },
    );

    rerender({ businessId: "business-2" });
    expect(result.current.stats).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      secondRequest.resolve(
        response({
          ...report,
          today: { ...report.today, salesTotal: 200 },
        }),
      );
      await secondRequest.promise;
    });

    await waitFor(() => expect(result.current.stats?.salesToday).toBe(200));

    await act(async () => {
      firstRequest.resolve(
        response({
          ...report,
          today: { ...report.today, salesTotal: 999 },
        }),
      );
      await firstRequest.promise;
    });

    expect(result.current.stats?.salesToday).toBe(200);
  });
});
