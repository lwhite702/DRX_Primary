export const ONBOARDING_COMPLETION_COOKIE = "drx_onboarding_complete";

export type OnboardingClaims = {
  metadata?: { onboardingComplete?: boolean };
  publicMetadata?: { onboardingComplete?: boolean };
  public_metadata?: { onboardingComplete?: boolean };
};

export function hasCompletedOnboardingClaims(claims: OnboardingClaims | null | undefined) {
  return (
    claims?.metadata?.onboardingComplete === true ||
    claims?.publicMetadata?.onboardingComplete === true ||
    claims?.public_metadata?.onboardingComplete === true
  );
}

export function isOnboardingCompletionCookieValue(value: string | undefined | null) {
  return value === "true";
}

export function hasCompletedOnboardingSettings(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const settings = value as Record<string, unknown>;
  return settings.onboarding_completed === true || settings.onboardingComplete === true;
}

export function hasOnboardingCompletionCookieFromHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return false;

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some((part) => {
      const [name, ...valueParts] = part.split("=");
      return (
        name === ONBOARDING_COMPLETION_COOKIE &&
        isOnboardingCompletionCookieValue(valueParts.join("="))
      );
    });
}
