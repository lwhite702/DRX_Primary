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
  AppError: () => AppError,
  AuthRequiredError: () => AuthRequiredError,
  PermissionDeniedError: () => PermissionDeniedError,
  TenantRequiredError: () => TenantRequiredError,
  ValidationError: () => ValidationError,
  captureError: () => captureError,
  initErrors: () => initErrors,
  setUserContext: () => setUserContext
});
module.exports = __toCommonJS(react_native_exports);
var Sentry = __toESM(require("@sentry/react-native"));

// src/shared.ts
var AppError = class extends Error {
  code;
  statusCode;
  context;
  constructor(message, code, statusCode = 500, context) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
};
var AuthRequiredError = class extends AppError {
  constructor(message = "Authentication required", context) {
    super(message, "AUTH_REQUIRED", 401, context);
  }
};
var TenantRequiredError = class extends AppError {
  constructor(message = "Tenant context required", context) {
    super(message, "TENANT_REQUIRED", 400, context);
  }
};
var PermissionDeniedError = class extends AppError {
  constructor(message = "Permission denied", context) {
    super(message, "PERMISSION_DENIED", 403, context);
  }
};
var ValidationError = class extends AppError {
  constructor(message, context) {
    super(message, "VALIDATION_ERROR", 400, context);
  }
};

// src/react-native.ts
function initErrors(config) {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || "production"
  });
}
function setUserContext(user) {
  Sentry.setUser(user);
}
function captureError(err, context) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      Sentry.captureException(err, { extra: { ...err.context, ...context } });
    } else {
      console.warn(`[${err.code}] ${err.message}`, { context: err.context, ...context });
    }
  } else {
    Sentry.captureException(err, { extra: context });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppError,
  AuthRequiredError,
  PermissionDeniedError,
  TenantRequiredError,
  ValidationError,
  captureError,
  initErrors,
  setUserContext
});
