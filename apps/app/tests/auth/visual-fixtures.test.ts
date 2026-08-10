import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthVisualFixtureEnabled } from "@/lib/auth/visual-fixtures";

describe("auth visual fixture guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows deterministic fixtures during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VISUAL_FIXTURES", "true");

    expect(isAuthVisualFixtureEnabled()).toBe(true);
  });

  it("never exposes fixtures in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VISUAL_FIXTURES", "true");

    expect(isAuthVisualFixtureEnabled()).toBe(false);
  });
});
