/**
 * Client-side (browser) analytics adapter
 * Wraps posthog-js for browser environments
 */

import posthog from "posthog-js";

let initialized = false;

export interface AnalyticsConfig {
  apiKey: string;
  host?: string;
  capturePageview?: boolean;
  persistence?: "localStorage" | "localStorage+cookie" | "cookie" | "memory";
  autocapture?: boolean;
}

export function initAnalytics(config: AnalyticsConfig) {
  if (initialized) return;
  if (!config.apiKey) {
    console.warn("[wrelik/analytics] No API key provided, skipping initialization");
    return;
  }

  posthog.init(config.apiKey, {
    api_host: config.host || "https://us.i.posthog.com",
    capture_pageview: config.capturePageview ?? false,
    persistence: config.persistence || "localStorage+cookie",
    autocapture: config.autocapture ?? true,
    loaded: (instance) => {
      instance.set_config({ capture_pageleave: true });
    },
  });

  initialized = true;
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function capture(event: string, properties?: Record<string, any>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function capturePageView(url: string, properties?: Record<string, any>) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: url, ...properties });
}

export function setUserProperties(properties: Record<string, any>) {
  if (!initialized) return;
  posthog.people.set(properties);
}

export function reset() {
  if (!initialized) return;
  posthog.reset();
}

export function isFeatureEnabled(flagKey: string, defaultValue = false): boolean {
  if (!initialized) return defaultValue;
  return posthog.isFeatureEnabled(flagKey) ?? defaultValue;
}

export function getFeatureFlag(flagKey: string): string | boolean | undefined {
  if (!initialized) return undefined;
  return posthog.getFeatureFlag(flagKey);
}

export function onFeatureFlags(callback: () => void) {
  if (!initialized) return;
  posthog.onFeatureFlags(callback);
}

export function reloadFeatureFlags() {
  if (!initialized) return;
  posthog.reloadFeatureFlags();
}

export { posthog as _posthog };
