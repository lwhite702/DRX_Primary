export function isAuthBypassEnabledServer() {
  const isBypassRequested =
    process.env.DANGEROUS_BYPASS_AUTH_FOR_TESTING_ONLY === "true" ||
    process.env.BYPASS_AUTH_FOR_TESTING === "true";

  if (
    isBypassRequested &&
    (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production")
  ) {
    throw new Error(
      "FATAL SECURITY VIOLATION: Auth bypass is strictly prohibited in production environments."
    );
  }

  const isAllowedEnv = process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development";
  return isAllowedEnv && isBypassRequested;
}

if (isAuthBypassEnabledServer()) {
  console.warn(
    "⚠️ WARNING: Authentication bypass is ENABLED. This is strictly prohibited in production and only allowed in test or development environments."
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
