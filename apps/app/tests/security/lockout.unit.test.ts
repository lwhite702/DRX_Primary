import { describe, expect, it } from "vitest";

import {
  deriveLockoutState,
  isWindowExpired,
  LOCKOUT_MAX_ATTEMPTS,
} from "@/lib/security/lockout";

describe("lockout policy", () => {
  it("tracks remaining attempts before lockout", () => {
    const state = deriveLockoutState(2, null);

    expect(state.locked).toBe(false);
    expect(state.remaining_attempts).toBe(LOCKOUT_MAX_ATTEMPTS - 2);
    expect(state.locked_until).toBeNull();
  });

  it("returns locked when locked_until is in the future", () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
    const state = deriveLockoutState(LOCKOUT_MAX_ATTEMPTS, lockedUntil);

    expect(state.locked).toBe(true);
    expect(state.remaining_attempts).toBe(0);
    expect(state.locked_until).toBe(lockedUntil.toISOString());
  });

  it("expires lockout windows older than 15 minutes", () => {
    const oldWindow = new Date(Date.now() - 16 * 60 * 1000);
    const recentWindow = new Date(Date.now() - 2 * 60 * 1000);

    expect(isWindowExpired(oldWindow)).toBe(true);
    expect(isWindowExpired(recentWindow)).toBe(false);
  });
});
