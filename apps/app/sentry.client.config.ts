import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.1,
    replaysOnErrorSampleRate: 1,
    sendDefaultPii: true,
  });
}
