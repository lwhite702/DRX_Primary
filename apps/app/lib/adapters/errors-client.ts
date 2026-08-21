import { initErrors } from "@wrelik/errors/client";

export function initClientErrorInstrumentation() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  if (!dsn) {
    console.warn("[errors] No SENTRY_DSN provided, error tracking disabled");
    return;
  }
  
  initErrors({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
}
