import {
  validateEventName
} from "./chunk-ZASOR6XP.mjs";

// src/react-native.ts
import PostHog from "posthog-react-native";
function initAnalytics(apiKey, host = "https://app.posthog.com") {
  PostHog.initAsync(apiKey, {
    host
  });
}
function identify(userId, traits) {
  PostHog.identify(userId, traits);
}
function capture(event, properties = {}, options) {
  validateEventName(event);
  if (options?.userId) {
  }
  PostHog.capture(event, properties);
}
async function shutdown() {
}
export {
  capture,
  identify,
  initAnalytics,
  shutdown
};
