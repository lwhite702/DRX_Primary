import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickActions } from "@/app/(app)/dashboard/_components/QuickActions";

describe("dashboard quick actions", () => {
  it.each([
    ["operations", ["Start Sale", "Receive Stock", "Add Customer", "Manage Credit"]],
    ["checkout", ["Start Sale", "Add Customer", "Record Payment", "Sales Reports"]],
    ["inventory", ["Receive Stock", "Adjust Stock", "Inventory Audit", "Find Product"]],
  ] as const)("shows four relevant %s actions", (preset, labels) => {
    render(<QuickActions preset={preset} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links.map((link) => link.textContent)).toEqual(
      labels.map((label) => expect.stringContaining(label)),
    );
  });

  it("links the primary sale action directly to the register", () => {
    render(<QuickActions preset="operations" />);

    expect(screen.getByRole("link", { name: /start sale/i })).toHaveAttribute(
      "href",
      "/pos/sale",
    );
  });
});
