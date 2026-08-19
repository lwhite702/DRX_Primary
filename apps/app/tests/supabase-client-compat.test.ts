import { afterEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/data/client/supabase-client");

describe("legacy Supabase browser compatibility client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails closed when browser credentials are not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { createAppClient } =
      await import("@/lib/data/client/supabase-client");

    expect(createAppClient()).toBeNull();
  });
});
