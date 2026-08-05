// src/client.ts
import posthog from "posthog-js";
var initialized = false;
function initAnalytics(config) {
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
    }
  });
  initialized = true;
}
function identify(userId, traits) {
  if (!initialized) return;
  posthog.identify(userId, traits);
}
function capture(event, properties) {
  if (!initialized) return;
  posthog.capture(event, properties);
}
function capturePageView(url, properties) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: url, ...properties });
}
function setUserProperties(properties) {
  if (!initialized) return;
  posthog.people.set(properties);
}
function reset() {
  if (!initialized) return;
  posthog.reset();
}
function isFeatureEnabled(flagKey, defaultValue = false) {
  if (!initialized) return defaultValue;
  return posthog.isFeatureEnabled(flagKey) ?? defaultValue;
}
function getFeatureFlag(flagKey) {
  if (!initialized) return void 0;
  return posthog.getFeatureFlag(flagKey);
}
function onFeatureFlags(callback) {
  if (!initialized) return;
  posthog.onFeatureFlags(callback);
}
function reloadFeatureFlags() {
  if (!initialized) return;
  posthog.reloadFeatureFlags();
}
export {
  posthog as _posthog,
  capture,
  capturePageView,
  getFeatureFlag,
  identify,
  initAnalytics,
  isFeatureEnabled,
  onFeatureFlags,
  reloadFeatureFlags,
  reset,
  setUserProperties
};
