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

// src/next.ts
var next_exports = {};
__export(next_exports, {
  getSession: () => getSession
});
module.exports = __toCommonJS(next_exports);
var import_nextjs = require("@clerk/nextjs");

// src/shared.ts
var import_errors = require("@wrelik/errors");

// src/index.ts
function fromClerkAuth(auth2) {
  var _a, _b;
  if (!auth2 || !auth2.userId) {
    return { userId: null, tenantId: null, roles: [] };
  }
  const roles = ((_b = (_a = auth2.sessionClaims) == null ? void 0 : _a.publicMetadata) == null ? void 0 : _b.roles) || [];
  return {
    userId: auth2.userId,
    tenantId: auth2.orgId || null,
    roles
  };
}

// src/next.ts
function getSession() {
  const clerkAuth = (0, import_nextjs.auth)();
  return fromClerkAuth(clerkAuth);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getSession
});
