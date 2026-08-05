import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));

import SalesPage from "@/app/(app)/sales/page";

describe("legacy sales route", () => {
  beforeEach(() => redirect.mockClear());

  it("uses the maintained register without loading the legacy browser POS", () => {
    SalesPage();
    expect(redirect).toHaveBeenCalledWith("/pos/sale");
  });
});
