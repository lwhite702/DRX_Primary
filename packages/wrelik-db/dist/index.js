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
  assertTenantAccess: () => assertTenantAccess,
  getPrismaSingleton: () => getPrismaSingleton,
  setTenantAccessChecker: () => setTenantAccessChecker,
  withTenant: () => withTenant
});
module.exports = __toCommonJS(index_exports);
var import_errors = require("@wrelik/errors");
var accessChecker = async () => false;
function setTenantAccessChecker(checker) {
  accessChecker = checker;
}
async function assertTenantAccess(userId, tenantId) {
  if (!userId || !tenantId) {
    throw new import_errors.TenantRequiredError();
  }
  const allowed = await accessChecker(userId, tenantId);
  if (!allowed) {
    throw new import_errors.PermissionDeniedError(`User ${userId} does not have access to tenant ${tenantId}`);
  }
}
function withTenant(tenantId, fn) {
  if (!tenantId) {
    throw new import_errors.TenantRequiredError();
  }
  return fn(tenantId);
}
function getPrismaSingleton(factory) {
  const globalForPrisma = global;
  const prisma = globalForPrisma.prisma || factory();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  return prisma;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertTenantAccess,
  getPrismaSingleton,
  setTenantAccessChecker,
  withTenant
});
