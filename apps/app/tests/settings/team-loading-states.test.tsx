import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import TeamClient from "@/app/(app)/settings/team/_components/TeamClient";

vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("TeamClient terminal loading states", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(usePermission).mockReturnValue({
      hasPermission: vi.fn(() => true),
      permissions: ["staff.manage"],
      loading: false,
      refreshPermissions: vi.fn(),
    });
  });

  it("shows a skeleton only while business resolution is active", () => {
    vi.mocked(useBusiness).mockReturnValue({
      business: null,
      loading: true,
    } as unknown as ReturnType<typeof useBusiness>);

    render(<TeamClient />);

    expect(screen.getByLabelText("Loading page")).toHaveAttribute("aria-busy", "true");
  });

  it("terminates loading with setup guidance when no business exists", async () => {
    vi.mocked(useBusiness).mockReturnValue({
      business: null,
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>);

    render(<TeamClient />);

    expect(await screen.findByText("Finish business setup")).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading page")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("replaces a failed request with a visible retry state", async () => {
    vi.mocked(useBusiness).mockReturnValue({
      business: { id: "business-1" },
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>);
    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Team service unavailable" }),
    });

    render(<TeamClient />);

    expect(
      await screen.findByText("Team members could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText("Team service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });

  it("shows a meaningful empty team state after a successful request", async () => {
    vi.mocked(useBusiness).mockReturnValue({
      business: { id: "business-1" },
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>);
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    });

    render(<TeamClient />);

    await waitFor(() => {
      expect(
        screen.getByText("No additional team members have been added yet."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Loading page")).not.toBeInTheDocument();
  });

  it("does not render the previous business team during a business switch", async () => {
    let currentBusiness = {
      business: { id: "business-1" },
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>;
    vi.mocked(useBusiness).mockImplementation(() => currentBusiness);

    let resolveSecondRequest!: (value: unknown) => void;
    const secondRequest = new Promise((resolve) => {
      resolveSecondRequest = resolve;
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            {
              id: "member-1",
              user_id: "user-1",
              business_id: "business-1",
              role: "cashier",
              created_at: "2026-08-20T12:00:00.000Z",
              email: "operator-one@example.test",
            },
          ],
        }),
      })
      .mockReturnValueOnce(secondRequest);

    const { rerender } = render(<TeamClient />);
    expect(await screen.findByText("operator-one@example.test")).toBeInTheDocument();

    currentBusiness = {
      business: { id: "business-2" },
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>;
    rerender(<TeamClient />);

    expect(screen.getByLabelText("Loading page")).toBeInTheDocument();
    expect(screen.queryByText("operator-one@example.test")).not.toBeInTheDocument();

    resolveSecondRequest({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    });
    await waitFor(() => {
      expect(
        screen.getByText("No additional team members have been added yet."),
      ).toBeInTheDocument();
    });
  });
});
