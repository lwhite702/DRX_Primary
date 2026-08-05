import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry/privacy";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.DEPLOYMENT_ENV || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    sendDefaultPii: true,
    beforeSend: scrubSentryEvent,
  });
}
