import * as Sentry from '@sentry/react-native';
import { AppError } from './shared';

export * from './shared';

export function initErrors(config: { dsn: string; environment?: string }) {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || 'production',
  });
}

export function setUserContext(user: { id: string; email?: string } | null) {
  Sentry.setUser(user);
}

export function captureError(err: unknown, context?: Record<string, any>) {
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
