import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/hooks/use-realtime");

import {
  setRealtimeChannelFactoryForTests,
  useRealtimeCustomers,
  useRealtimeInventory,
} from "@/lib/hooks/use-realtime";

function apiResponse(data: unknown) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({ data }),
  } as unknown as Response;
}

function failedApiResponse() {
  return {
    ok: false,
    json: vi.fn().mockResolvedValue({}),
  } as unknown as Response;
}

describe("useRealtimeInventory", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    setRealtimeChannelFactoryForTests(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("never renders a late response from the previous business", async () => {
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(
        apiResponse([
          { id: "item-2", businessId: "business-2", productName: "Current" },
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ businessId }) => useRealtimeInventory(businessId),
      { initialProps: { businessId: "business-1" as string | null } },
    );

    rerender({ businessId: "business-2" });
    await waitFor(() => expect(result.current.inventory[0]?.id).toBe("item-2"));

    await act(async () => {
      resolveFirst(
        apiResponse([
          { id: "item-1", businessId: "business-1", productName: "Stale" },
        ]),
      );
      await firstResponse;
    });

    expect(result.current.inventory.map((item) => item.id)).toEqual(["item-2"]);
  });

  it("keeps current inventory visible during a background refresh", async () => {
    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          apiResponse([
            { id: "item-1", businessId: "business-1", productName: "Current" },
          ]),
        )
        .mockReturnValueOnce(refreshResponse),
    );

    const { result } = renderHook(() => useRealtimeInventory("business-1"));
    await waitFor(() => expect(result.current.inventory).toHaveLength(1));

    act(() => {
      void result.current.refresh();
    });
    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.inventory[0]?.id).toBe("item-1");

    await act(async () => {
      resolveRefresh(
        apiResponse([
          { id: "item-1", businessId: "business-1", productName: "Updated" },
        ]),
      );
      await refreshResponse;
    });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.inventory[0]?.product_name).toBe("Updated");
  });

  it("terminates the initial inventory loader with an actionable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failedApiResponse()));

    const { result } = renderHook(() => useRealtimeInventory("business-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.inventory).toEqual([]);
    expect(result.current.error).toMatch(/temporarily unavailable/i);
    expect(result.current.syncStatus).toBe("offline");
  });

  it("terminates the initial customer loader with an actionable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failedApiResponse()));

    const { result } = renderHook(() => useRealtimeCustomers("business-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.customers).toEqual([]);
    expect(result.current.error).toMatch(/temporarily unavailable/i);
    expect(result.current.syncStatus).toBe("offline");
  });

  it("discards customer normalization that completes after a business switch", async () => {
    const callbacks = new Map<string, (payload: unknown) => Promise<void>>();
    setRealtimeChannelFactoryForTests((name) => {
      const channel = {
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };
      channel.on.mockImplementation(
        (
          _event: string,
          _filter: unknown,
          callback: (payload: unknown) => Promise<void>,
        ) => {
          callbacks.set(name, callback);
          return channel;
        },
      );
      channel.subscribe.mockImplementation(() => channel);
      return channel;
    });

    let resolveDetail!: (response: Response) => void;
    const detailResponse = new Promise<Response>((resolve) => {
      resolveDetail = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(apiResponse([{ id: "customer-a" }]))
        .mockReturnValueOnce(detailResponse)
        .mockResolvedValueOnce(apiResponse([{ id: "customer-b" }])),
    );

    const { result, rerender } = renderHook(
      ({ businessId }) => useRealtimeCustomers(businessId),
      { initialProps: { businessId: "business-a" as string | null } },
    );
    await waitFor(() =>
      expect(result.current.customers[0]?.id).toBe("customer-a"),
    );

    let staleEvent!: Promise<void>;
    act(() => {
      staleEvent = callbacks.get("customers:business-a")?.({
        eventType: "INSERT",
        new: { id: "customer-a-late" },
      }) as Promise<void>;
    });
    rerender({ businessId: "business-b" });
    await waitFor(() =>
      expect(result.current.customers[0]?.id).toBe("customer-b"),
    );

    await act(async () => {
      resolveDetail({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: "customer-a-late",
          first_name: "Stale",
        }),
      } as unknown as Response);
      await staleEvent;
    });

    expect(result.current.customers.map((customer) => customer.id)).toEqual([
      "customer-b",
    ]);
  });
});
