import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SentryFeedbackButton } from "@/components/sentry-feedback-button";
import { SentryFeedbackWidget, useSentryFeedback } from "@/components/feedback/sentry-feedback-widget";
import * as feedbackHelper from "@/lib/sentry/feedback";

describe("Sentry Feedback Components & Helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders SentryFeedbackButton and triggers openSentryFeedbackDialog on click", async () => {
    const openSpy = vi.spyOn(feedbackHelper, "openSentryFeedbackDialog").mockResolvedValue(true);
    vi.spyOn(feedbackHelper, "getSentryFeedbackClient").mockReturnValue({
      createForm: vi.fn(),
    });

    render(
      <SentryFeedbackButton source="test_source" placeholder="Test placeholder">
        Report Bug
      </SentryFeedbackButton>,
    );

    const button = screen.getByRole("button", { name: "Report Bug" });
    expect(button).toBeDefined();

    fireEvent.click(button);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith({
        messagePlaceholder: "Test placeholder",
        source: "test_source",
      });
    });
  });

  it("triggers useSentryFeedback hook to open feedback dialog", async () => {
    const openSpy = vi.spyOn(feedbackHelper, "openSentryFeedbackDialog").mockResolvedValue(true);

    function TestComponent() {
      const { openFeedback } = useSentryFeedback();
      return (
        <button onClick={() => openFeedback({ source: "hook_test", messagePlaceholder: "Hook placeholder" })}>
          Trigger Feedback
        </button>
      );
    }

    render(<TestComponent />);
    fireEvent.click(screen.getByRole("button", { name: "Trigger Feedback" }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith({
        source: "hook_test",
        messagePlaceholder: "Hook placeholder",
      });
    });
  });

  it("renders SentryFeedbackWidget without throwing", () => {
    vi.spyOn(feedbackHelper, "getSentryFeedbackClient").mockReturnValue({
      createForm: vi.fn(),
    });

    const { container } = render(<SentryFeedbackWidget />);
    expect(container.firstChild).toBeNull();
  });

  it("opens Sentry dialog when client is available in openSentryFeedbackDialog", async () => {
    const appendToDom = vi.fn();
    const open = vi.fn();
    const createForm = vi.fn().mockResolvedValue({ appendToDom, open });

    (window as any).Sentry = {
      getFeedback: () => ({ createForm }),
    };

    const result = await feedbackHelper.openSentryFeedbackDialog({
      messagePlaceholder: "Testing dialog",
      source: "unit_test",
    });

    expect(result).toBe(true);
    expect(createForm).toHaveBeenCalledWith({
      messagePlaceholder: "Testing dialog",
      tags: { "feedback.source": "unit_test" },
    });
    expect(appendToDom).toHaveBeenCalled();
    expect(open).toHaveBeenCalled();
    delete (window as any).Sentry;
  });
});
