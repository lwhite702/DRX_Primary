import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ChunkRecoveryProvider } from "@/components/providers/chunk-recovery-provider";

describe("ChunkRecoveryProvider", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows an explicit recovery action without reloading automatically", async () => {
    render(<ChunkRecoveryProvider />);
    const event = new Event("unhandledrejection");
    Object.defineProperty(event, "reason", {
      value: new Error("ChunkLoadError: Loading chunk 42 failed"),
    });

    window.dispatchEvent(event);

    expect(
      await screen.findByText("This screen could not finish loading"),
    ).toBeInTheDocument();
    expect(window.location.search).not.toContain("_chunk_retry");
    expect(screen.getByRole("button", { name: "Reload DRX" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss loading error" }));
    expect(
      screen.queryByText("This screen could not finish loading"),
    ).not.toBeInTheDocument();
  });

  it("ignores ordinary application errors", () => {
    render(<ChunkRecoveryProvider />);
    const event = new Event("unhandledrejection");
    Object.defineProperty(event, "reason", {
      value: new Error("Customer profile load failed"),
    });

    window.dispatchEvent(event);

    expect(
      screen.queryByText("This screen could not finish loading"),
    ).not.toBeInTheDocument();
  });
});
