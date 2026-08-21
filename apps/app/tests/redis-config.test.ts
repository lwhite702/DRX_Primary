import { describe, expect, it } from "vitest";
import { validateRedisEnvironment } from "@/lib/redis";

describe("Redis environment contract", () => {
  it("allows a configuration-free local runtime", () => {
    expect(validateRedisEnvironment({})).toEqual({
      configured: false,
      error: null,
    });
  });

  it("rejects a partial Redis configuration", () => {
    expect(
      validateRedisEnvironment({ KV_REST_API_URL: "https://example.invalid" }),
    ).toMatchObject({ configured: false });
    expect(
      validateRedisEnvironment({ KV_REST_API_TOKEN: "redacted" }),
    ).toMatchObject({ configured: false });
  });

  it.each(["preview", "production"] as const)(
    "requires Redis in the %s environment",
    (VERCEL_ENV) => {
      expect(validateRedisEnvironment({ VERCEL_ENV })).toMatchObject({
        configured: false,
        error: expect.stringContaining("required"),
      });
    },
  );

  it("accepts a complete deployed configuration without exposing values", () => {
    expect(
      validateRedisEnvironment({
        VERCEL_ENV: "production",
        KV_REST_API_URL: "https://example.invalid",
        KV_REST_API_TOKEN: "redacted",
      }),
    ).toEqual({ configured: true, error: null });
  });
});
