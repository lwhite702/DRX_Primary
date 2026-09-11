import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ load: vi.fn(), record: vi.fn() }));
vi.mock("@/lib/pos/inventory-check-client", async importOriginal => ({ ...await importOriginal<typeof import("../../lib/pos/inventory-check-client")>(), getCheckProduct: mocks.load, recordCheck: mocks.record }));
import { InventoryCheckModal } from "../../components/pos/inventory-check-modal";
import { InventoryCheckRejectedError } from "../../lib/pos/inventory-check-client";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const product = { inventory_id: "product", product_name: "Synthetic", expected_weight_grams: 0 };
const receipt = { success: true, check_id: "check", expected_weight_grams: 0, measured_weight_grams: 1, delta_grams: 1, delta_percentage: null, discrepancy_flagged: true, shrinkage_id: null };
it("retries the original check and renders undefined percentage explicitly", async () => {
  mocks.load.mockResolvedValue(product); mocks.record.mockRejectedValueOnce(new Error("Uncertain")).mockResolvedValue(receipt);
  render(<InventoryCheckModal open businessId="tenant" onClose={vi.fn()} />);
  await screen.findByText("Synthetic"); fireEvent.change(screen.getByLabelText("Measured Weight (grams)"), { target: { value: "1" } }); fireEvent.click(screen.getByText("Submit Check"));
  await screen.findByText("Retry Check"); expect((screen.getByLabelText("Measured Weight (grams)") as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByText("Retry Check")); await screen.findByText("Not applicable (zero expected stock)");
  expect(mocks.record.mock.calls[0]).toEqual(mocks.record.mock.calls[1]);
});
it("loads a fresh snapshot and clears the measurement after a stale-stock rejection", async () => {
  mocks.load.mockResolvedValue(product); mocks.record.mockRejectedValue(new InventoryCheckRejectedError("STALE_STOCK", "Stock changed"));
  render(<InventoryCheckModal open businessId="tenant" onClose={vi.fn()} />);
  await screen.findByText("Synthetic"); fireEvent.change(screen.getByLabelText("Measured Weight (grams)"), { target: { value: "1" } }); fireEvent.click(screen.getByText("Submit Check"));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
  await waitFor(() => expect((screen.getByLabelText("Measured Weight (grams)") as HTMLInputElement).value).toBe(""));
});
