import {
  AppError,
  AuthRequiredError,
  PermissionDeniedError,
  TenantRequiredError,
  ValidationError
} from "./chunk-Y6OMLFFG.mjs";

// src/browser.ts
import * as Sentry from "@sentry/browser";
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
function initErrors(dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1
  });
}
export {
  AppError,
  AuthRequiredError,
  PermissionDeniedError,
  TenantRequiredError,
  ValidationError,
  captureError,
  initErrors,
  setUserContext
};
