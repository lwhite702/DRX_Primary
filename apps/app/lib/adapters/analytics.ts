/**
 * Analytics Adapter
 *
 * Wraps @wrelik/analytics helpers for event tracking.
 */

import {
  capture as captureAnalytics,
  identify as identifyAnalytics,
  initAnalytics,
  shutdown as shutdownAnalytics,
} from "@wrelik/analytics/server";

export { initAnalytics, shutdownAnalytics };

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>,
  options?: { userId?: string }
) {
  return captureAnalytics(eventName, properties, options);
}

/**
 * Identify a user
 */
export function identifyUser(userId: string, traits: Record<string, any> = {}) {
  return identifyAnalytics(userId, traits);
}

/**
 * Track a page view
 */
export function trackPageView(page: string, properties?: Record<string, any>) {
  return captureAnalytics("app.view.page", { page, ...properties });
}
