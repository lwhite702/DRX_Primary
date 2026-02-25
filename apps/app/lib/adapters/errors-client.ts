import * as Sentry from "@sentry/nextjs";

export function initClientErrorInstrumentation() {
  Sentry.init({
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 1,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
  });
}

