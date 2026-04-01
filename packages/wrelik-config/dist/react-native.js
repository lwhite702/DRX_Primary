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

// src/react-native.ts
var react_native_exports = {};
__export(react_native_exports, {
  clientSchema: () => clientSchema,
  commonSchema: () => commonSchema,
  loadClientConfig: () => loadClientConfig
});
module.exports = __toCommonJS(react_native_exports);
var import_zod2 = require("zod");

// src/shared.ts
var import_zod = require("zod");
var commonSchema = {
  NODE_ENV: import_zod.z.enum(["development", "test", "production"]).default("development").optional()
};
var clientSchema = {
  EXPO_PUBLIC_APP_NAME: import_zod.z.string().default("DRX App"),
  EXPO_PUBLIC_APP_ENV: import_zod.z.enum(["development", "staging", "production"]).default("development"),
  EXPO_PUBLIC_API_URL: import_zod.z.string().url().optional(),
  // Vendors
  EXPO_PUBLIC_POSTHOG_KEY: import_zod.z.string().optional(),
  EXPO_PUBLIC_POSTHOG_HOST: import_zod.z.string().default("https://app.posthog.com"),
  EXPO_PUBLIC_SENTRY_DSN: import_zod.z.string().optional(),
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: import_zod.z.string().optional()
};

// src/react-native.ts
function loadClientConfig(extraSchema = {}, env = process.env) {
  const mergedSchema = import_zod2.z.object({
    ...commonSchema,
    ...clientSchema,
    ...extraSchema
  });
  const result = mergedSchema.safeParse(env);
  if (!result.success) {
    console.error("\u274C Invalid client environment variables:", result.error.format());
    throw new Error("Invalid client environment variables");
  }
  return result.data;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clientSchema,
  commonSchema,
  loadClientConfig
});
