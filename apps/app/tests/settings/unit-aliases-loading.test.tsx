import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ id: "tenant-a", load: vi.fn() }));
vi.mock("@/lib/hooks/use-business", () => ({ useBusiness: () => ({ business: { id: mocks.id }, loading: false }) }));
vi.mock("@/lib/inventory/unit-aliases-client", () => ({ loadUnitAliases: mocks.load, changeUnitAlias: vi.fn() }));
import Page from "../../app/(app)/settings/inventory/aliases/page";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("ignores a late alias response after switching businesses", async () => {
  let resolveOld!: (value: unknown[]) => void;
  mocks.id = "tenant-a";
  mocks.load.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce([{ id: "b", alias_name: "New tenant alias", quantity: 1.25, standard_unit: "g", is_enabled: true, is_system_default: false }]);
  const page = render(<Page />);
  mocks.id = "tenant-b"; page.rerender(<Page />);
  expect(await screen.findByText("New tenant alias")).toBeTruthy();
  resolveOld([{ id: "a", alias_name: "Old tenant alias", quantity: 2, standard_unit: "g", is_enabled: true, is_system_default: false }]);
  await waitFor(() => expect(screen.queryByText("Old tenant alias")).toBeNull());
  expect(screen.getByText("New tenant alias")).toBeTruthy();
});
