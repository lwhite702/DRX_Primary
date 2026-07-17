import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry/privacy";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.1,
    replaysOnErrorSampleRate: 1,
    sendDefaultPii: true,
    beforeSend: scrubSentryEvent,
  });
}
