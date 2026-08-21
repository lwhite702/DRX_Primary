import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getCreditAging: vi.fn(),
  extendCredit: vi.fn(),
  processPayment: vi.fn(),
  toastSuccess: vi.fn(),
}));

function queryResult(data: unknown[]) {
  const result = { data, error: null };
  type Query = PromiseLike<typeof result> & {
    select: (...args: unknown[]) => Query;
    eq: (...args: unknown[]) => Query;
    order: (...args: unknown[]) => Query;
    limit: (...args: unknown[]) => Query;
  };
  const promise = Promise.resolve(result);
  const query: Query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: promise.then.bind(promise),
  };
  return query;
}

vi.mock("@/lib/data/client/supabase-client", () => ({
  createAppClient: () => ({ from: mocks.from }),
}));

vi.mock("@/lib/utils/credit-system", () => ({
  creditSystem: {
    getCreditAging: mocks.getCreditAging,
    extendCredit: mocks.extendCredit,
    processPayment: mocks.processPayment,
  },
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: vi.fn() },
}));

import { useCreditManager } from "@/app/(app)/credit/_hooks/useCreditManager";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("credit business switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) =>
      queryResult(
        table === "customers"
          ? [{ id: "customer", first_name: "Current", last_name: "Business" }]
          : [],
      ),
    );
    mocks.getCreditAging.mockResolvedValue({ success: true, data: [] });
    mocks.processPayment.mockResolvedValue({ success: true });
  });

  it("does not refresh or publish a completed mutation from the previous business", async () => {
    const extension = deferred<{ success: boolean }>();
    mocks.extendCredit.mockReturnValue(extension.promise);

    const { result, rerender } = renderHook(
      ({ businessId }) => useCreditManager(businessId),
      { initialProps: { businessId: "business-a" } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutation!: Promise<void>;
    act(() => {
      mutation = result.current.handleExtension({
        customer_id: "customer-a",
        amount: 10,
      });
    });
    rerender({ businessId: "business-b" });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callsAfterBusinessBLoad = mocks.from.mock.calls.length;
    await act(async () => {
      extension.resolve({ success: true });
      await mutation;
    });

    expect(mocks.extendCredit).toHaveBeenCalledWith(
      "business-a",
      "customer-a",
      10,
      "",
      expect.any(String),
    );
    expect(mocks.from).toHaveBeenCalledTimes(callsAfterBusinessBLoad);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(result.current.customers[0]?.id).toBe("customer");
  });
});
