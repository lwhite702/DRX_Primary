/* eslint-disable no-restricted-imports -- Client Sentry feedback helper uses @sentry/nextjs */
import * as Sentry from "@sentry/nextjs";

export interface SentryFeedbackFormOptions {
  messagePlaceholder?: string;
  source?: string;
  tags?: Record<string, string>;
}

export type SentryFeedbackClient = {
  createForm: (options?: {
    messagePlaceholder?: string;
    tags?: Record<string, string>;
  }) => Promise<{ appendToDom: () => void; open: () => void }>;
  createWidget?: () => void;
  remove?: () => void;
};

export function getSentryFeedbackClient(): SentryFeedbackClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  const windowSentry = (window as Window & { Sentry?: typeof Sentry }).Sentry;
  const client = Sentry.getFeedback?.() ?? windowSentry?.getFeedback?.();
  return (client as unknown as SentryFeedbackClient) ?? null;
}

export async function openSentryFeedbackDialog(
  options?: SentryFeedbackFormOptions,
): Promise<boolean> {
  const client = getSentryFeedbackClient();
  if (!client) {
    return false;
  }

  const tags: Record<string, string> = {
    ...(options?.tags || {}),
  };
  if (options?.source) {
    tags["feedback.source"] = options.source;
  }

  const form = await client.createForm({
    messagePlaceholder: options?.messagePlaceholder,
    tags: Object.keys(tags).length > 0 ? tags : undefined,
  });

  form.appendToDom();
  form.open();
  return true;
}
