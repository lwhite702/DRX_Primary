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
  hasRole: () => hasRole,
  mapClerkToSession: () => mapClerkToSession,
  requireRole: () => requireRole,
  requireTenant: () => requireTenant,
  requireUser: () => requireUser
});
module.exports = __toCommonJS(react_native_exports);

// src/shared.ts
var import_errors = require("@wrelik/errors");
function requireUser(session) {
  if (!session || !session.userId) {
    throw new import_errors.AuthRequiredError();
  }
  return session.userId;
}
function requireTenant(session) {
  requireUser(session);
  if (!session || !session.tenantId) {
    throw new import_errors.TenantRequiredError();
  }
  return session.tenantId;
}
function hasRole(session, role) {
  if (!session || !session.userId) return false;
  return session.roles.includes(role);
}
function requireRole(session, role) {
  if (!hasRole(session, role)) {
    throw new import_errors.PermissionDeniedError(`Role ${role} required`);
  }
}

// src/react-native.ts
function mapClerkToSession(auth) {
  var _a, _b, _c;
  if (!auth || !auth.userId) {
    return { userId: null, tenantId: null, roles: [] };
  }
  const roles = ((_c = (_b = (_a = auth.session) == null ? void 0 : _a.user) == null ? void 0 : _b.publicMetadata) == null ? void 0 : _c.roles) || [];
  return {
    userId: auth.userId,
    tenantId: auth.orgId || null,
    roles
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  hasRole,
  mapClerkToSession,
  requireRole,
  requireTenant,
  requireUser
});
