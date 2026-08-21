import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tour } from "@/components/ui/tour";

const scrollIntoViewMock = vi.fn();

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverAnchor: () => null,
  PopoverContent: ({
    children,
    side: _side,
    sideOffset: _sideOffset,
    collisionPadding: _collisionPadding,
    avoidCollisions: _avoidCollisions,
    sticky: _sticky,
    hideWhenDetached: _hideWhenDetached,
    updatePositionStrategy: _updatePositionStrategy,
    onOpenAutoFocus: _onOpenAutoFocus,
    onCloseAutoFocus: _onCloseAutoFocus,
    ...props
  }: Record<string, unknown> & { children: ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

describe("Tour", () => {
  beforeEach(() => {
    window.localStorage.clear();
    scrollIntoViewMock.mockClear();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
  });

  it("anchors to each target and persists completion", async () => {
    const onComplete = vi.fn();
    render(
      <>
        <div id="tour-first" />
        <div id="tour-second" />
        <Tour
          tourId="sequence"
          onComplete={onComplete}
          steps={[
            { targetId: "tour-first", title: "First step", description: "First" },
            { targetId: "tour-second", title: "Second step", description: "Second" },
          ]}
        />
      </>,
    );

    expect(await screen.findByText("First step")).toBeInTheDocument();
    expect(document.getElementById("tour-first")).toHaveAttribute(
      "data-drx-tour-active",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Second step")).toBeInTheDocument();
    expect(document.getElementById("tour-first")).not.toHaveAttribute(
      "data-drx-tour-active",
    );

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(window.localStorage.getItem("drx_tour_sequence")).toBe("true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("skips a missing target instead of showing an overlapping centered card", async () => {
    render(
      <>
        <div id="tour-present" />
        <Tour
          tourId="missing-target"
          onComplete={() => {}}
          steps={[
            { targetId: "tour-missing", title: "Missing step", description: "Missing" },
            { targetId: "tour-present", title: "Present step", description: "Present" },
          ]}
        />
      </>,
    );

    expect(screen.queryByText("Missing step")).not.toBeInTheDocument();
    expect(await screen.findByText("Present step", {}, { timeout: 1500 })).toBeInTheDocument();
  });

  it("allows only one tour overlay at a time", async () => {
    render(
      <>
        <div id="tour-a" />
        <div id="tour-b" />
        <Tour
          tourId="tour-a"
          onComplete={() => {}}
          steps={[{ targetId: "tour-a", title: "Tour A", description: "A" }]}
        />
        <Tour
          tourId="tour-b"
          onComplete={() => {}}
          steps={[{ targetId: "tour-b", title: "Tour B", description: "B" }]}
        />
      </>,
    );

    expect(await screen.findByText("Tour A")).toBeInTheDocument();
    expect(screen.queryByText("Tour B")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(await screen.findByText("Tour B")).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("disables smooth scrolling when reduced motion is requested", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });

    render(
      <>
        <div id="reduced-motion-target" />
        <Tour
          tourId="reduced-motion"
          onComplete={() => {}}
          steps={[
            {
              targetId: "reduced-motion-target",
              title: "Reduced motion",
              description: "No smooth scroll",
            },
          ]}
        />
      </>,
    );

    expect(await screen.findByText("Reduced motion")).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
    });
  });
});
