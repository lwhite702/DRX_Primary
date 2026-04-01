"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  capture: () => capture,
  identify: () => identify,
  initAnalytics: () => initAnalytics,
  shutdown: () => shutdown
});
module.exports = __toCommonJS(index_exports);
var import_posthog_node = require("posthog-node");

// src/shared.ts
var import_errors = require("@wrelik/errors");
function validateEventName(event) {
  const parts = event.split(".");
  if (parts.length < 3) {
    throw new import_errors.ValidationError(`Event name "${event}" must follow "app.action.object" format`);
  }
}

// src/index.ts
var client = null;
function initAnalytics(apiKey, host = "https://app.posthog.com") {
  client = new import_posthog_node.PostHog(apiKey, { host });
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  capture,
  identify,
  initAnalytics,
  shutdown
});
