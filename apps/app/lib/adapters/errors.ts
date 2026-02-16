/**
 * Error Tracking Adapter
 *
 * Wraps @wrelik/errors helpers.
 */

import { captureError as capture, setUserContext } from "@wrelik/errors";

/**
 * Capture an error
 */
export function captureError(error: Error, context?: Record<string, any>) {
  return capture(error, context);
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "error"
) {
  const tagged = new Error(message);
  return capture(tagged, { level });
}

/**
 * Add breadcrumbs for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, any>
) {
  // @wrelik/errors has no breadcrumb API; capture as lightweight context.
  return capture(new Error(message), { category, ...data });
}

/**
 * Set user context
 */
export function setUser(
  id: string,
  email?: string,
  attributes?: Record<string, any>
) {
  return setUserContext({ id, email, ...(attributes || {}) });
}
