export function isAuthBypassEnabledServer() {
  const isAllowedEnv = process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development";
  return isAllowedEnv && process.env.BYPASS_AUTH_FOR_TESTING === "true";
}

if (isAuthBypassEnabledServer()) {
  console.warn(
    "⚠️ WARNING: Authentication bypass is ENABLED. This is only allowed in test or development environments."
  );
}

export function getBypassAuthUserId(): string {
  const id = process.env.BYPASS_AUTH_USER_ID;
  if (!id) {
    throw new Error("BYPASS_AUTH_USER_ID environment variable must be explicitly set when auth bypass is enabled.");
  }
  return id;
}

export function getBypassAuthOrgId(): string {
  const id = process.env.BYPASS_AUTH_ORG_ID;
  if (!id) {
    throw new Error("BYPASS_AUTH_ORG_ID environment variable must be explicitly set when auth bypass is enabled.");
  }
  return id;
}
