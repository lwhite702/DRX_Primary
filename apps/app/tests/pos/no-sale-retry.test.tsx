import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/pos/drawer-client", () => ({ recordDrawerEvent: mocks.record }));
import { NoSaleButton } from "../../components/pos/no-sale-button";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("reuses the pending request on failure and starts a new event after confirmation", async () => {
  mocks.record.mockRejectedValueOnce(new Error("uncertain")).mockResolvedValue({ success: true, event_id: "event-a" });
  render(<NoSaleButton businessId="tenant-a" />);
  fireEvent.click(screen.getByText("Open Drawer / No Sale"));
  await waitFor(() => expect((screen.getByText("Open Drawer / No Sale") as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByText("Open Drawer / No Sale"));
  await waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(2));
  expect(mocks.record.mock.calls[0][3]).toBe(mocks.record.mock.calls[1][3]);
  await waitFor(() => expect((screen.getByText("Open Drawer / No Sale") as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByText("Open Drawer / No Sale"));
  await waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(3));
  expect(mocks.record.mock.calls[2][3]).not.toBe(mocks.record.mock.calls[1][3]);
});
