/**
 * Error Tracking Adapter
 *
 * Wraps @wrelik/errors for Sentry integration
 */

import { errorTracker } from "@wrelik/errors";

export { errorTracker };

/**
 * Capture an error
 */
export function captureError(
  error: Error,
  context?: Record<string, any>
) {
  return errorTracker.capture(error, context);
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level?: "info" | "warning" | "error"
) {
  return errorTracker.captureMessage(message, level);
}

/**
 * Add breadcrumbs for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, any>
) {
  return errorTracker.breadcrumb(message, category, data);
}

/**
 * Set user context
 */
export function setUser(
  id: string,
  email?: string,
  attributes?: Record<string, any>
) {
  return errorTracker.setUser(id, email, attributes);
}
