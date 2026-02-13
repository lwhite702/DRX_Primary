import {
  validateEventName
} from "./chunk-ZASOR6XP.mjs";

// src/index.ts
import { PostHog } from "posthog-node";
var client = null;
function initAnalytics(apiKey, host = "https://app.posthog.com") {
  client = new PostHog(apiKey, { host });
}
function getClient(safe = false) {
  if (!client && !safe) {
    throw new Error("Analytics not initialized. Call initAnalytics first.");
  }
  return client;
}
function identify(userId, traits) {
  getClient(true)?.identify({
    distinctId: userId,
    properties: traits
  });
}
function capture(event, properties = {}, options) {
  validateEventName(event);
  if (!options?.userId) {
    console.warn("Analytics capture called without userId");
    return;
  }
  getClient(true)?.capture({
    distinctId: options.userId,
    event,
    properties
  });
}
async function shutdown() {
  await getClient(true)?.shutdown();
}
export {
  capture,
  identify,
  initAnalytics,
  shutdown
};
