import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "@/components/auth/auth-shell";

describe("AuthShell", () => {
  it("renders main landmark with role='main' and id='main-content'", () => {
    render(
      <AuthShell eyebrow="Operator access" description="Sign in to open your business.">
        <div>Form Content</div>
      </AuthShell>,
    );

    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveAttribute("id", "main-content");
  });

  it("renders footer when provided and omits when not provided", () => {
    const { rerender } = render(
      <AuthShell eyebrow="Operator access" description="Sign in to open your business.">
        <div>Form Content</div>
      </AuthShell>,
    );

    expect(screen.queryByTestId("custom-footer")).not.toBeInTheDocument();

    rerender(
      <AuthShell
        eyebrow="Operator access"
        description="Sign in to open your business."
        footer={<div data-testid="custom-footer">Footer text</div>}
      >
        <div>Form Content</div>
      </AuthShell>,
    );

    expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
  });
});
