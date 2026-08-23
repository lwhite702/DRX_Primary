import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const SENSITIVE_KEY = /password|passcode|token|secret|authorization|cookie|payment|card|customer|phone|address|request_body|form/i;

const IGNORED_ERROR_PATTERNS = [
  /runtime\.sendMessage/i,
  /The message port closed before a response was received/i,
  /Extension context invalidated/i,
  /Could not establish connection\. Receiving end does not exist/i,
  /ResizeObserver loop/i,
];

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

export function isExtensionOrNoiseError(event: ErrorEvent, hint?: EventHint): boolean {
  const originalException = hint?.originalException;
  if (originalException) {
    const message =
      originalException instanceof Error
        ? originalException.message
        : typeof originalException === "string"
          ? originalException
          : (originalException as { message?: string })?.message || "";
    if (IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return true;
    }
  }

  if (event.message && IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(event.message!))) {
    return true;
  }

  if (event.exception?.values) {
    for (const val of event.exception.values) {
      const valStr = `${val.type || ""} ${val.value || ""}`;
      if (IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(valStr))) {
        return true;
      }
    }
  }

  return false;
}

export function scrubSentryEvent(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  if (isExtensionOrNoiseError(event, hint)) {
    return null;
  }

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
