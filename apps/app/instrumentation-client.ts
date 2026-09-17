/* eslint-disable no-restricted-imports -- Next.js requires client Sentry initialization in this entrypoint. */
import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry/privacy";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_DEPLOYMENT_ENV ||
      process.env.NODE_ENV ||
      "development",
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    ignoreErrors: [
      "Invalid call to runtime.sendMessage(). Tab not found.",
      /runtime\.sendMessage/i,
      "The message port closed before a response was received.",
      /Extension context invalidated/i,
      "Could not establish connection. Receiving end does not exist.",
      "ResizeObserver loop completed with undelivered notifications.",
      "ResizeObserver loop limit exceeded",
    ],
    denyUrls: [
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
      /^safari-web-extension:\/\//i,
      /^webkit-masked-url:\/\//i,
    ],
    beforeSend: scrubSentryEvent,
    integrations: [
      Sentry.feedbackSyncIntegration({
        autoInject: false,
        colorScheme: "dark",
        isEmailRequired: false,
        isNameRequired: false,
        showEmail: true,
        showName: true,
        enableScreenshot: true,
        useSentryUser: {
          email: "email",
          name: "username",
        },
        themeDark: {
          background: "#0c0d0e",
          foreground: "#f4f4f5",
          accentBackground: "#a3e635",
          accentForeground: "#000000",
          inputBackground: "#18181b",
          inputBorder: "#27272a",
          submitBackground: "#a3e635",
          submitForeground: "#000000",
        },
      }),
    ],
  });

  if (typeof window !== "undefined") {
    (window as Window & { Sentry?: typeof Sentry }).Sentry = Sentry;
  }
}

export const onRouterTransitionStart = () => {};
