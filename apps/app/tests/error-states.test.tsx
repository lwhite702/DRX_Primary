import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GlobalError from "@/app/global-error";
import NotFound from "@/app/not-found";

describe("Error and fallback states", () => {
  it("renders global error boundary with digest and recovery buttons", () => {
    const errorWithDigest = Object.assign(new Error("Database connection lost"), {
      digest: "ERR_CONVEX_9981",
    });
    render(<GlobalError error={errorWithDigest} />);
    expect(screen.getByText("This page could not load")).toBeInTheDocument();
    expect(screen.getByText("ERR_CONVEX_9981")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to dashboard/i })).toBeInTheDocument();
    // Verify raw error message/stack is not leaked in the user UI
    expect(screen.queryByText("Database connection lost")).not.toBeInTheDocument();
  });

  it("renders not found page", () => {
    render(<NotFound />);
    expect(screen.getByText(/not found|404/i)).toBeInTheDocument();
  });
});
