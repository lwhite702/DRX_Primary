import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ExitPosDialog } from "@/components/quick-pos/exit-pos-dialog";

const fetchMock = vi.fn();

vi.mock("@/lib/adapters/auth/ui", () => ({
  useIsBypassActive: () => false,
}));

describe("ExitPosDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("can confirm an exit without entering a PIN", async () => {
    const onSuccess = vi.fn();
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ allowed: true }),
    });

    render(
      <ExitPosDialog open onClose={vi.fn()} onSuccess={onSuccess} />,
    );

    const confirm = screen.getByRole("button", { name: "Confirm Exit" });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pos/exit/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ pin: "" }),
      }),
    );
  });

  it("shows an actionable message when a configured PIN is rejected", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ allowed: false }),
    });

    render(
      <ExitPosDialog open onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm Exit" }));

    expect(
      await screen.findByText("Enter the configured manager PIN and try again."),
    ).toBeVisible();
  });
});
