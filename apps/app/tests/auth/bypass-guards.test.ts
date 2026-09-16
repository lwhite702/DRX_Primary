import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAuthBypassEnabledServer } from "@/lib/auth/bypass";

describe("auth bypass guards", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enables bypass in test environment when DANGEROUS_BYPASS_AUTH_FOR_TESTING_ONLY is true", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DANGEROUS_BYPASS_AUTH_FOR_TESTING_ONLY", "true");
    expect(isAuthBypassEnabledServer()).toBe(true);
  });

  it("throws fatal security violation error if bypass is requested in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DANGEROUS_BYPASS_AUTH_FOR_TESTING_ONLY", "true");
    expect(() => isAuthBypassEnabledServer()).toThrow(/FATAL SECURITY VIOLATION/);
  });

  it("throws fatal security violation error if legacy BYPASS_AUTH_FOR_TESTING is set in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BYPASS_AUTH_FOR_TESTING", "true");
    expect(() => isAuthBypassEnabledServer()).toThrow(/FATAL SECURITY VIOLATION/);
  });

  it("returns false when bypass is not requested", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DANGEROUS_BYPASS_AUTH_FOR_TESTING_ONLY", "false");
    vi.stubEnv("BYPASS_AUTH_FOR_TESTING", "false");
    expect(isAuthBypassEnabledServer()).toBe(false);
  });
});
