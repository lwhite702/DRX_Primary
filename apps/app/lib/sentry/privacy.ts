import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const SENSITIVE_KEY = /password|passcode|token|secret|authorization|cookie|payment|card|customer|phone|address|request_body|form/i;

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[Filtered]" : scrubValue(item),
    ]),
  );
}

export function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  if (event.request) {
    event.request.cookies = undefined;
    event.request.data = undefined;
    event.request.query_string = undefined;
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(([key]) => !SENSITIVE_KEY.test(key)),
      );
    }
  }
  event.extra = scrubValue(event.extra) as ErrorEvent["extra"];
  event.contexts = scrubValue(event.contexts) as ErrorEvent["contexts"];
  return event;
}
