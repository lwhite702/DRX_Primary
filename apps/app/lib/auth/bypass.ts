export const BYPASS_AUTH_USER_ID =
  process.env.BYPASS_AUTH_USER_ID || "11111111-1111-4111-8111-111111111111";

export const BYPASS_AUTH_ORG_ID =
  process.env.BYPASS_AUTH_ORG_ID || "org_local_bypass";

export function isAuthBypassEnabledServer() {
  return (
    process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true" ||
    process.env.BYPASS_AUTH_FOR_TESTING === "true"
  );
}

export function isAuthBypassEnabledClient() {
  return process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";
}

