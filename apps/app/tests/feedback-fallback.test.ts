import { afterEach, describe, expect, it, vi } from "vitest";

import { openFeedbackWithFallback } from "@/lib/feedback";
import { docsHelpdeskUrl } from "@/lib/featurebase-links";

describe("feedback fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses Sentry when the feedback form opens", async () => {
    const openSentry = vi.fn();
    const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

    await expect(openFeedbackWithFallback(openSentry)).resolves.toBe("sentry");
    expect(openSentry).toHaveBeenCalledOnce();
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it("opens Mintlify docs when Sentry is unavailable", async () => {
    const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

    await expect(openFeedbackWithFallback(null)).resolves.toBe("docs");
    expect(windowOpen).toHaveBeenCalledWith(
      docsHelpdeskUrl,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("opens Mintlify docs when Sentry throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

    await expect(
      openFeedbackWithFallback(() => {
        throw new Error("not loaded");
      }),
    ).resolves.toBe("docs");
    expect(windowOpen).toHaveBeenCalledOnce();
  });
});
