import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "@/components/auth/auth-shell";

describe("AuthShell", () => {
  it("uses a focused account layout and keeps the legal and help links available", () => {
    render(
      <AuthShell>
        <div>Account form</div>
      </AuthShell>,
    );

    expect(screen.getByRole("link", { name: "DRX home" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Legal and support links" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Help" })).toBeInTheDocument();
    expect(screen.queryByText("Run the day. Keep the operation moving.")).not.toBeInTheDocument();
  });

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

  it("keeps the existing waitlist shell when the waitlist copy is provided", () => {
    render(
      <AuthShell eyebrow="Beta access" description="Request access for your independent shop.">
        <div>Waitlist form</div>
      </AuthShell>,
    );

    expect(screen.getByRole("heading", { name: "Run the day. Keep the operation moving." })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Legal and support links" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Support" })).toBeInTheDocument();
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
