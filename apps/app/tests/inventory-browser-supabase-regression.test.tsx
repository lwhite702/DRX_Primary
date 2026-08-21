import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInventoryActions } from "@/app/(app)/inventory/_hooks/useInventoryActions";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("inventory browser data adapter", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads and normalizes inventory through the authenticated API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "b46c6235-6751-4e1d-a17e-a9a75d0aa210",
              businessId: "68b1e486-422e-478a-b5b8-f586da935e5d",
              sku: "SKU-1",
              productName: "Blue Dream",
              quantityOnHand: 12,
              reorderLevel: 3,
              baseUnit: "g",
              unitCost: "4.50",
              sellingPrice: "8.00",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useInventoryActions("68b1e486-422e-478a-b5b8-f586da935e5d"),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/inventory?limit=200&business_id=68b1e486-422e-478a-b5b8-f586da935e5d",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.inventory).toEqual([
      expect.objectContaining({
        product_name: "Blue Dream",
        quantity_on_hand: 12,
        unit_cost: 4.5,
        selling_price: 8,
      }),
    ]);
  });

  it("keeps the selected business context when editing inventory", async () => {
    const item = {
      id: "b46c6235-6751-4e1d-a17e-a9a75d0aa210",
      businessId: "68b1e486-422e-478a-b5b8-f586da935e5d",
      sku: "SKU-1",
      productName: "Blue Dream",
      quantityOnHand: 12,
      reorderLevel: 3,
      baseUnit: "g",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [item] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { ...item, productName: "Blue Dream Updated" },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useInventoryActions("68b1e486-422e-478a-b5b8-f586da935e5d"),
    );
    await waitFor(() => expect(result.current.inventory).toHaveLength(1));

    act(() => result.current.handleEdit(result.current.inventory[0]));
    await act(async () => {
      await result.current.handleSave({
        ...result.current.inventory[0],
        product_name: "Blue Dream Updated",
      });
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/inventory/b46c6235-6751-4e1d-a17e-a9a75d0aa210?business_id=68b1e486-422e-478a-b5b8-f586da935e5d",
      expect.objectContaining({ method: "PUT", credentials: "same-origin" }),
    );
  });

  it("does not publish a completed save from the previous business", async () => {
    let resolveSave!: (value: Response) => void;
    const pendingSave = new Promise<Response>((resolve) => {
      resolveSave = resolve;
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") return pendingSave;
      if (url.includes("business-b")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ businessId }) => useInventoryActions(businessId),
      { initialProps: { businessId: "business-a" } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let save!: Promise<void>;
    act(() => {
      save = result.current.handleSave({
        business_id: "business-a",
        sku: "SKU-A",
        product_name: "Business A Product",
        quantity_on_hand: 4,
        reorder_level: 1,
        unit_of_measure: "g",
      });
    });

    rerender({ businessId: "business-b" });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      resolveSave(
        new Response(
          JSON.stringify({
            id: "inventory-a",
            businessId: "business-a",
            sku: "SKU-A",
            productName: "Business A Product",
            quantityOnHand: 4,
          }),
          { status: 201 },
        ),
      );
      await save;
    });

    expect(result.current.inventory).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
