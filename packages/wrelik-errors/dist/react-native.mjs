import {
  AppError,
  AuthRequiredError,
  PermissionDeniedError,
  TenantRequiredError,
  ValidationError
} from "./chunk-Y6OMLFFG.mjs";

// src/react-native.ts
import * as Sentry from "@sentry/react-native";
function initErrors(config) {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || "production"
  });
}
function setUserContext(user) {
  Sentry.setUser(user);
}
function captureError(err, context) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      Sentry.captureException(err, { extra: { ...err.context, ...context } });
    } else {
      console.warn(`[${err.code}] ${err.message}`, { context: err.context, ...context });
    }
  } else {
    Sentry.captureException(err, { extra: context });
  }
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
