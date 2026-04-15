import * as Sentry from '@sentry/node';
import { AppError } from './shared';

export * from './shared';

export interface ErrorsConfig {
  dsn: string;
  environment?: string;
  tracesSampleRate?: number;
  sendDefaultPii?: boolean;
}

export function initErrors(config: ErrorsConfig) {
  if (!config.dsn) {
    console.warn("[wrelik/errors] No DSN provided, skipping Sentry initialization");
    return;
  }
  
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || process.env.NODE_ENV || "development",
    tracesSampleRate: config.tracesSampleRate ?? 1.0,
    sendDefaultPii: config.sendDefaultPii ?? true,
  });
}

export function captureError(err: unknown, context?: Record<string, any>) {
  if (err instanceof AppError) {
    // Basic logging for expected app errors
    console.warn(`[${err.code}] ${err.message}`, { context: err.context, ...context });
    // Still capture if it's 500 or critical? Maybe optional.
    if (err.statusCode >= 500) {
      Sentry.captureException(err, { extra: { ...err.context, ...context } });
    }
  } else {
    // Unexpected errors
    console.error('Unexpected error:', err);
    Sentry.captureException(err, { extra: context });
  }
}

export function setUserContext(user: { id: string; email?: string } | null) {
  Sentry.setUser(user);
}

export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
  });
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "error") {
  Sentry.captureMessage(message, level);
}
