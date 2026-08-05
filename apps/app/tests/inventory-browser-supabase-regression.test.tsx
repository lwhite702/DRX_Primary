import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInventoryActions } from "@/app/(app)/inventory/_hooks/useInventoryActions";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("inventory browser data adapter", () => {
  afterEach(() => {
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
          JSON.stringify({ data: { ...item, productName: "Blue Dream Updated" } }),
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
});
