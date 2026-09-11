import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const mocks = vi.hoisted(() => ({ record: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/pos/shrinkage-client", async importOriginal => ({ ...await importOriginal<typeof import("../../lib/pos/shrinkage-client")>(), recordShrinkage: mocks.record }));
vi.mock("@/lib/pos/shrinkage-inventory-client", () => ({ loadShrinkageInventory: mocks.load }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange, disabled }: { children: ReactNode; value: string; onValueChange: (value: string) => void; disabled: boolean }) => <select aria-label="Selection" value={value} disabled={disabled} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null, SelectValue: () => null,
}));
import { ShrinkageForm } from "../../components/pos/shrinkage-form";
import { ShrinkageRejectedError } from "../../lib/pos/shrinkage-client";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
async function fill() {
  await screen.findByText("Synthetic (SKU)");
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "product-a" } });
  fireEvent.change(screen.getByLabelText(/Quantity/), { target: { value: "0.4" } });
}
it("freezes an uncertain attempt and retries the same payload without a second removal", async () => {
  mocks.load.mockResolvedValue([{ id: "product-a", productName: "Synthetic", sku: "SKU", inventoryInGrams: 2, baseUnit: "g" }]);
  mocks.record.mockRejectedValueOnce(new Error("Uncertain")).mockResolvedValue({ success: true });
  const onSuccess = vi.fn(); render(<ShrinkageForm open businessId="tenant-a" onClose={vi.fn()} onSuccess={onSuccess} />);
  await fill(); fireEvent.click(screen.getByText("Record Shrinkage"));
  await screen.findByText("Retry Shrinkage");
  expect((screen.getByLabelText(/Quantity/) as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByText("Retry Shrinkage"));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(mocks.record.mock.calls[0]).toEqual(mocks.record.mock.calls[1]);
});
it("allows correction after a definitive rejected transaction", async () => {
  mocks.load.mockResolvedValue([{ id: "product-a", productName: "Synthetic", sku: "SKU", inventoryInGrams: 2 }]);
  mocks.record.mockRejectedValue(new ShrinkageRejectedError("Insufficient stock"));
  render(<ShrinkageForm open businessId="tenant-a" onClose={vi.fn()} />);
  await fill(); fireEvent.click(screen.getByText("Record Shrinkage"));
  await waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1));
  await waitFor(() => expect((screen.getByLabelText(/Quantity/) as HTMLInputElement).disabled).toBe(false));
});
it("discards catalog results after the selected business changes", async () => {
  let resolveOld!: (value: unknown[]) => void;
  mocks.load.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValue([]);
  const { rerender } = render(<ShrinkageForm open businessId="tenant-a" onClose={vi.fn()} />);
  rerender(<ShrinkageForm open businessId="tenant-b" onClose={vi.fn()} />);
  await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
  resolveOld([{ id: "old", productName: "Old tenant", sku: "OLD", inventoryInGrams: 2 }]);
  await waitFor(() => expect(screen.queryByText("Loading inventory...")).toBeNull());
  expect(screen.queryByText("Old tenant (OLD)")).toBeNull();
});
