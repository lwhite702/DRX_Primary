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

// src/react-native.ts
var react_native_exports = {};
__export(react_native_exports, {
  capture: () => capture,
  identify: () => identify,
  initAnalytics: () => initAnalytics,
  shutdown: () => shutdown
});
module.exports = __toCommonJS(react_native_exports);
var import_posthog_react_native = __toESM(require("posthog-react-native"));

// src/shared.ts
var import_errors = require("@wrelik/errors");
function validateEventName(event) {
  const parts = event.split(".");
  if (parts.length < 3) {
    throw new import_errors.ValidationError(`Event name "${event}" must follow "app.action.object" format`);
  }
}

// src/react-native.ts
function initAnalytics(apiKey, host = "https://app.posthog.com") {
  import_posthog_react_native.default.initAsync(apiKey, {
    host
  });
}
function identify(userId, traits) {
  import_posthog_react_native.default.identify(userId, traits);
}
function capture(event, properties = {}, options) {
  validateEventName(event);
  if (options?.userId) {
  }
  import_posthog_react_native.default.capture(event, properties);
}
async function shutdown() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  capture,
  identify,
  initAnalytics,
  shutdown
});
