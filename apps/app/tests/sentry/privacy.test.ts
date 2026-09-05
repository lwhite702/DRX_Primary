import { describe, expect, it } from "vitest";
import { isExtensionOrNoiseError, scrubSentryEvent } from "@/lib/sentry/privacy";
import type { ErrorEvent } from "@sentry/nextjs";

describe("Sentry privacy and browser extension error filter", () => {
  it("detects extension runtime.sendMessage rejection errors from hint", () => {
    const event = {
      message: "Uncaught Error",
      exception: {
        values: [{ type: "Error", value: "Invalid call to runtime.sendMessage(). Tab not found." }],
      },
    } as unknown as ErrorEvent;

    const hint = {
      originalException: new Error("Invalid call to runtime.sendMessage(). Tab not found."),
    };

    expect(isExtensionOrNoiseError(event, hint as any)).toBe(true);
    expect(scrubSentryEvent(event, hint as any)).toBeNull();
  });

  it("detects message port closed and extension invalidated errors from exception values", () => {
    const event = {
      exception: {
        values: [{ type: "Error", value: "The message port closed before a response was received." }],
      },
    } as unknown as ErrorEvent;

    expect(isExtensionOrNoiseError(event)).toBe(true);
    expect(scrubSentryEvent(event)).toBeNull();
  });

  it("detects ResizeObserver loop errors", () => {
    const event = {
      message: "ResizeObserver loop completed with undelivered notifications.",
    } as unknown as ErrorEvent;

    expect(isExtensionOrNoiseError(event)).toBe(true);
    expect(scrubSentryEvent(event)).toBeNull();
  });

  it("allows normal errors and scrubs sensitive headers and extra payload", () => {
    const event = {
      message: "Legitimate application error",
      request: {
        cookies: "session=xyz",
        data: "body=test",
        query_string: "?token=secret",
        headers: {
          authorization: "Bearer secret-token",
          "content-type": "application/json",
          cookie: "id=123",
          accept: "text/html",
        },
      },
      extra: {
        password: "my-secret-password",
        customer: "John Doe",
        orderId: "ORD-123",
      },
      contexts: {
        custom: {
          token: "auth-jwt",
          environment: "production",
        },
      },
    } as unknown as ErrorEvent;

    const result = scrubSentryEvent(event);
    expect(result).not.toBeNull();
    expect(result!.request?.cookies).toBeUndefined();
    expect(result!.request?.data).toBeUndefined();
    expect(result!.request?.query_string).toBeUndefined();
    expect(result!.request?.headers).toEqual({
      "content-type": "application/json",
      accept: "text/html",
    });
    expect(result!.extra).toEqual({
      password: "[Filtered]",
      customer: "[Filtered]",
      orderId: "ORD-123",
    });
    expect(result!.contexts).toEqual({
      custom: {
        token: "[Filtered]",
        environment: "production",
      },
    });
  });
});
