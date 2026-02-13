import {
  hasRole,
  requireRole,
  requireTenant,
  requireUser
} from "./chunk-5WLTDLEP.mjs";

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
export {
  hasRole,
  mapClerkToSession,
  requireRole,
  requireTenant,
  requireUser
};
