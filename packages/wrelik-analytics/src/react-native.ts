import PostHog from 'posthog-react-native';
import { validateEventName } from './shared';

export function initAnalytics(apiKey: string, host = 'https://app.posthog.com') {
  PostHog.initAsync(apiKey, {
    host,
  });
}

export function identify(userId: string, traits?: Record<string, any>) {
  PostHog.identify(userId, traits);
}

export function capture(
  event: string,
  properties: Record<string, any> = {},
  options?: { userId?: string; tenantId?: string },
) {
  validateEventName(event);

  // merge options into properties if needed, or handle separately if PostHog RN supports it
  // Usually capturing with explicit distinctId requires identifying first
  if (options?.userId) {
    // Optional: re-identify? No, usually not done on every capture unless user switched
  }

  PostHog.capture(event, properties);
}

export async function shutdown() {
  // PostHog RN doesn't need explicit shutdown usually
}
