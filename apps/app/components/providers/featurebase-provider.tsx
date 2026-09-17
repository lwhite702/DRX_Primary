"use client";

/**
 * @deprecated Featurebase has been retired in favor of Sentry User Feedback and Mintlify documentation.
 */
export function FeaturebaseProvider() {
  return null;
}

export function sanitizeEmail(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)) return undefined;
  return normalized;
}

export function sanitizeUserId(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!/^[a-zA-Z0-9:_-]{3,128}$/.test(normalized)) return undefined;
  return normalized;
}
