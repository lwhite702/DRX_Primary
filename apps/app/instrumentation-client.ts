/**
 * Client Instrumentation
 *
 * This file configures initialization of error tracking via @wrelik/errors
 */

import { errorTracker } from "@wrelik/errors";

errorTracker.init({
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 1,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: true,
});

export const onRouterTransitionStart = errorTracker.captureRouteStart;
