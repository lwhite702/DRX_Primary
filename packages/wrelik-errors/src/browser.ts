import * as Sentry from '@sentry/browser';
import { AppError } from './shared';

export * from './shared';

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

export function initErrors(dsn: string) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
  });
}
