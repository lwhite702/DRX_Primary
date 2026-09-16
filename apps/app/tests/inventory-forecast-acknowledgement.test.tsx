import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryForecastCard } from "@/components/ai/inventory-forecast-card";
import type { InventoryForecastResult } from "@/lib/utils/inventory-forecast";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
const forecast: InventoryForecastResult = {
  projectedStockoutDate: null, daysUntilStockout: 2, recommendedRestockQuantity: 12,
  restockUrgency: "high", inventoryRiskLevel: "high", reasoning: "Synthetic forecast",
  confidenceScore: 90, factors: {}, velocityTrend: "stable",
};
const props = { forecast, currentStock: 2, reorderLevel: 5, productName: "Synthetic", sku: "SYN", inventoryId: "product-a", businessId: "business-a", forecastId: "analysis-a", contextKey: "user-a:business-a", alertIds: ["alert-a", "alert-b"] };
const fetchMock = vi.fn();
const receipt = (body: unknown = { success: true, status: "acknowledged" }, ok = true) => ({ ok, json: async () => body });
beforeEach(() => { vi.clearAllMocks(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("forecast persisted alert acknowledgement", () => {
  it("does not invent an alert ID from the analysis when no saved alerts exist", () => {
    render(<InventoryForecastCard {...props} alertIds={[]} />);
    const button = screen.getByRole("button", { name: "No alerts to acknowledge" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("acknowledges only distinct saved IDs and requires confirmed receipts", async () => {
    fetchMock.mockResolvedValue(receipt());
    render(<InventoryForecastCard {...props} alertIds={["alert-a", "alert-a", "alert-b"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Acknowledged" })).toBeDisabled());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url, options]) => [url, JSON.parse(options.body)])).toEqual([
      ["/api/ai/alerts", { business_id: "business-a", action: "acknowledge", alert_id: "alert-a" }],
      ["/api/ai/alerts", { business_id: "business-a", action: "acknowledge", alert_id: "alert-b" }],
    ]);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("reports partial failure honestly and retries only unconfirmed IDs", async () => {
    fetchMock.mockResolvedValueOnce(receipt()).mockRejectedValueOnce(new Error("network"));
    render(<InventoryForecastCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Some alerts")));
    expect(toast.success).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(receipt());
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    await screen.findByRole("button", { name: "Acknowledged" });
    expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body).alert_id)).toEqual(["alert-a", "alert-b", "alert-b"]);
  });

  it.each([receipt({ success: true }), receipt(undefined, false)])("does not accept a malformed or failed response", async (response) => {
    fetchMock.mockResolvedValue(response);
    render(<InventoryForecastCard {...props} alertIds={["alert-a"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Acknowledge" })).toBeEnabled();
  });

  it("stops the old operation and ignores its receipt after an operator context switch", async () => {
    let finish!: (value: ReturnType<typeof receipt>) => void;
    fetchMock.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const view = render(<InventoryForecastCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    view.rerender(<InventoryForecastCard {...props} contextKey="user-b:business-a" alertIds={[]} />);
    await act(async () => { finish(receipt()); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "No alerts to acknowledge" })).toBeDisabled();
  });

  it("stops remaining requests on unmount", async () => {
    let finish!: (value: ReturnType<typeof receipt>) => void;
    fetchMock.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const view = render(<InventoryForecastCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    view.unmount();
    await act(async () => { finish(receipt()); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
