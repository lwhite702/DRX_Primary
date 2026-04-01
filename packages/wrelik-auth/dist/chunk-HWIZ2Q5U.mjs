// src/index.ts
function fromClerkAuth(auth) {
  var _a, _b;
  if (!auth || !auth.userId) {
    return { userId: null, tenantId: null, roles: [] };
  }
  const roles = ((_b = (_a = auth.sessionClaims) == null ? void 0 : _a.publicMetadata) == null ? void 0 : _b.roles) || [];
  return {
    userId: auth.userId,
    tenantId: auth.orgId || null,
    roles
  };
}

export {
  fromClerkAuth
};
