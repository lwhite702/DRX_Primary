import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChangeEvent, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    disabled,
    onValueChange,
    value,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <select
      disabled={disabled}
      value={value}
      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
        onValueChange?.(event.target.value)
      }
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

describe("TeamClient terminal loading states", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    vi.mocked(usePermission).mockReturnValue({
      hasPermission: vi.fn(() => true),
      permissions: ["staff.manage"],
      loading: false,
      refreshPermissions: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a skeleton only while business resolution is active", () => {
    vi.mocked(useBusiness).mockReturnValue({
      business: null,
      loading: true,
    } as unknown as ReturnType<typeof useBusiness>);

    render(<TeamClient />);

    expect(screen.getByLabelText("Loading page")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("terminates loading with setup guidance when no business exists", async () => {
    vi.mocked(useBusiness).mockReturnValue({
      business: null,
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>);

    render(<TeamClient />);

    expect(
      await screen.findByText("Finish business setup"),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
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
    expect(
      await screen.findByText("operator-one@example.test"),
    ).toBeInTheDocument();

    currentBusiness = {
      business: { id: "business-2" },
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>;
    rerender(<TeamClient />);

    expect(screen.getByLabelText("Loading page")).toBeInTheDocument();
    expect(
      screen.queryByText("operator-one@example.test"),
    ).not.toBeInTheDocument();

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

  it("does not publish a role update from the previous business", async () => {
    const user = userEvent.setup();
    let currentBusiness = {
      business: { id: "business-1" },
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>;
    vi.mocked(useBusiness).mockImplementation(() => currentBusiness);

    let resolveRoleUpdate!: (value: unknown) => void;
    const pendingRoleUpdate = new Promise((resolve) => {
      resolveRoleUpdate = resolve;
    });
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === "PUT") return pendingRoleUpdate;
        const businessId = url.includes("business-2")
          ? "business-2"
          : "business-1";
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [
              {
                id: `member-${businessId}`,
                user_id: `user-${businessId}`,
                business_id: businessId,
                role: "cashier",
                created_at: "2026-08-20T12:00:00.000Z",
                email: `${businessId}@example.test`,
              },
            ],
          }),
        });
      },
    );

    const rendered = render(<TeamClient />);
    const businessAEmail = await screen.findByText("business-1@example.test");
    const businessARow = businessAEmail.closest("tr");
    expect(businessARow).not.toBeNull();
    await user.selectOptions(
      within(businessARow!).getByRole("combobox"),
      "manager",
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("business_id=business-1"),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    currentBusiness = {
      business: { id: "business-2" },
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>;
    rendered.rerender(<TeamClient />);
    expect(
      await screen.findByText("business-2@example.test"),
    ).toBeInTheDocument();

    await act(async () => {
      resolveRoleUpdate({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { role: "manager" } }),
      });
      await pendingRoleUpdate;
    });

    expect(
      screen.queryByText("business-1@example.test"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("business-2@example.test")).toBeInTheDocument();
  });
});
