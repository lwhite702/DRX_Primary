/**
 * Analytics Adapter
 *
 * Wraps @wrelik/analytics for event tracking with PostHog
 */

import { analytics } from "@wrelik/analytics";

export { analytics };

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>,
  options?: { tenantId?: string }
) {
  return analytics.track(eventName, properties, options);
}

/**
 * Identify a user
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, any>
) {
  return analytics.identify(userId, traits);
}

/**
 * Track a page view
 */
export function trackPageView(
  page: string,
  properties?: Record<string, any>
) {
  return analytics.page(page, properties);
}
