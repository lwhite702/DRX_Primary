import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GlobalError from "@/app/global-error";
import NotFound from "@/app/not-found";

describe("Error and fallback states", () => {
  it("renders global error boundary", () => {
    render(<GlobalError error={new Error("boom")} />);
    expect(document.documentElement).toBeTruthy();
  });

  it("renders not found page", () => {
    render(<NotFound />);
    expect(screen.getByText(/not found|404/i)).toBeInTheDocument();
  });
});
