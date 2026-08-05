"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.ts
var client_exports = {};
__export(client_exports, {
  _posthog: () => import_posthog_js.default,
  capture: () => capture,
  capturePageView: () => capturePageView,
  getFeatureFlag: () => getFeatureFlag,
  identify: () => identify,
  initAnalytics: () => initAnalytics,
  isFeatureEnabled: () => isFeatureEnabled,
  onFeatureFlags: () => onFeatureFlags,
  reloadFeatureFlags: () => reloadFeatureFlags,
  reset: () => reset,
  setUserProperties: () => setUserProperties
});
module.exports = __toCommonJS(client_exports);
var import_posthog_js = __toESM(require("posthog-js"));
var initialized = false;
function initAnalytics(config) {
  if (initialized) return;
  if (!config.apiKey) {
    console.warn("[wrelik/analytics] No API key provided, skipping initialization");
    return;
  }
  import_posthog_js.default.init(config.apiKey, {
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
  import_posthog_js.default.identify(userId, traits);
}
function capture(event, properties) {
  if (!initialized) return;
  import_posthog_js.default.capture(event, properties);
}
function capturePageView(url, properties) {
  if (!initialized) return;
  import_posthog_js.default.capture("$pageview", { $current_url: url, ...properties });
}
function setUserProperties(properties) {
  if (!initialized) return;
  import_posthog_js.default.people.set(properties);
}
function reset() {
  if (!initialized) return;
  import_posthog_js.default.reset();
}
function isFeatureEnabled(flagKey, defaultValue = false) {
  if (!initialized) return defaultValue;
  return import_posthog_js.default.isFeatureEnabled(flagKey) ?? defaultValue;
}
function getFeatureFlag(flagKey) {
  if (!initialized) return void 0;
  return import_posthog_js.default.getFeatureFlag(flagKey);
}
function onFeatureFlags(callback) {
  if (!initialized) return;
  import_posthog_js.default.onFeatureFlags(callback);
}
function reloadFeatureFlags() {
  if (!initialized) return;
  import_posthog_js.default.reloadFeatureFlags();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  _posthog,
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
});
