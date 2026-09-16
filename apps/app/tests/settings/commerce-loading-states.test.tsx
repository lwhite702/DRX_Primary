import type { ComponentType } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { getFunctionName } from "convex/server";
import {
  getDefaultCommerceSettings,
  getDefaultProductCommerceConfig,
} from "@/lib/commerce/config";

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn() }));
vi.mock("convex/react", () => ({
  useQuery: mocks.query,
  useMutation: () => mocks.mutation,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let CommerceSettingsPage: ComponentType;
const fetchMock = vi.fn();
const products = [
  {
    id: "product-a",
    name: "Sample product",
    sku: "SAMPLE",
    baseUnitPrice: 10,
    availableQuantity: 20,
    config: getDefaultProductCommerceConfig(),
  },
];
const payload = {
  businessId: "business-a",
  merchant: getDefaultCommerceSettings().merchant,
  products,
  customers: [],
};
const empty: never[] = [];
const directory = { members: [] };
let settings = { businessId: "business-a", userId: "owner", role: "OWNER" };
let canonicalPending = false;
const response = (status: number, body: unknown) => ({
  ok: status === 200,
  status,
  json: async () => body,
});

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.example.test");
  CommerceSettingsPage = (await import("@/app/(app)/settings/commerce/page"))
    .default;
});
afterAll(() => {
  vi.unstubAllEnvs();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("commerce settings load recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    canonicalPending = false;
    settings = { businessId: "business-a", userId: "owner", role: "OWNER" };
    vi.stubGlobal("fetch", fetchMock);
    mocks.query.mockImplementation((reference) => {
      if (canonicalPending) return undefined;
      switch (getFunctionName(reference)) {
        case "session:currentBusiness":
          return settings;
        case "members:listMembers":
          return directory;
        default:
          return empty;
      }
    });
  });

  it("replaces a forbidden load with access guidance, then retries without a mutation", async () => {
    fetchMock.mockResolvedValue(response(403, { error: "Forbidden" }));
    render(<CommerceSettingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "permission to configure commerce for this business",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Allow fractional sales"),
    ).not.toBeInTheDocument();

    fetchMock.mockResolvedValue(response(200, payload));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByLabelText("Allow fractional sales"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Suggested dollar amounts"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.mutation).not.toHaveBeenCalled();
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toBe("/api/pos/commerce-settings");
      expect(options.method).toBeUndefined();
    }
  });

  it.each([
    [401, "Sign in and select your business"],
    [500, "Unable to load commerce settings"],
  ])("ends loading for HTTP %i", async (status, message) => {
    fetchMock.mockResolvedValue(
      response(status, { error: "Unable to load commerce settings" }),
    );
    render(<CommerceSettingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("ends loading after a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network unavailable"));
    render(<CommerceSettingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows loading only while canonical settings are pending", async () => {
    canonicalPending = true;
    fetchMock.mockResolvedValue(response(403, { error: "Forbidden" }));
    const { rerender } = render(<CommerceSettingsPage />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading commerce settings",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    canonicalPending = false;
    rerender(<CommerceSettingsPage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("ignores an obsolete successful request after a newer load is denied", async () => {
    let finishOldRequest!: (value: ReturnType<typeof response>) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOldRequest = resolve;
        }),
    );
    const { rerender } = render(<CommerceSettingsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    settings = { businessId: "business-a", userId: "owner", role: "OWNER" };
    fetchMock.mockResolvedValue(response(403, { error: "Forbidden" }));
    rerender(<CommerceSettingsPage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await act(async () => {
      finishOldRequest(response(200, payload));
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Allow fractional sales"),
    ).not.toBeInTheDocument();
  });

  it("rejects settings returned for a different business", async () => {
    settings = { businessId: "business-b", userId: "owner", role: "OWNER" };
    fetchMock.mockResolvedValue(response(200, payload));
    render(<CommerceSettingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "do not match the selected business",
    );
    expect(
      screen.queryByLabelText("Allow fractional sales"),
    ).not.toBeInTheDocument();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("preserves actionable business-unavailable errors", async () => {
    fetchMock.mockResolvedValue(
      response(403, { error: "Business is unavailable" }),
    );
    render(<CommerceSettingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Business is unavailable",
    );
  });

  it("saves through the authenticated server mutation without a second client write", async () => {
    fetchMock.mockResolvedValue(response(200, payload));
    render(<CommerceSettingsPage />);
    await screen.findByLabelText("Allow fractional sales");
    fetchMock.mockResolvedValue(
      response(403, { error: "Business is unavailable" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Save.*loyalty|Save.*delivery|Save.*policy/i,
      }),
    );
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(mocks.mutation).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH"),
    ).toBe(true);
  });
});
