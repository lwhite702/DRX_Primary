import {
  AppError,
  AuthRequiredError,
  PermissionDeniedError,
  TenantRequiredError,
  ValidationError
} from "./chunk-Y6OMLFFG.mjs";

// src/browser.ts
import * as Sentry from "@sentry/browser";
function initErrors(config) {
  if (!config.dsn) {
    console.warn("[wrelik/errors] No DSN provided, skipping Sentry initialization");
    return;
  }
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || process.env.NODE_ENV || "development",
    tracesSampleRate: config.tracesSampleRate ?? 1,
    replaysSessionSampleRate: config.replaysSessionSampleRate ?? 0.1,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate ?? 1,
    sendDefaultPii: config.sendDefaultPii ?? true
  });
}
function captureError(err, context) {
  if (err instanceof AppError) {
    console.warn(`[${err.code}] ${err.message}`, { context: err.context, ...context });
    if (err.statusCode >= 500) {
      Sentry.captureException(err, { extra: { ...err.context, ...context } });
    }
  } else {
    console.error("Unexpected error:", err);
    Sentry.captureException(err, { extra: context });
  }
}
function setUserContext(user) {
  Sentry.setUser(user);
}
function addBreadcrumb2(message, category, data) {
  Sentry.addBreadcrumb({
    message,
    category,
    data
  });
}
function captureMessage2(message, level = "error") {
  Sentry.captureMessage(message, level);
}
export {
  AppError,
  AuthRequiredError,
  PermissionDeniedError,
  TenantRequiredError,
  ValidationError,
  addBreadcrumb2 as addBreadcrumb,
  captureError,
  captureMessage2 as captureMessage,
  initErrors,
  setUserContext
};
