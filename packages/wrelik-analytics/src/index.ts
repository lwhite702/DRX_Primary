import { PostHog } from 'posthog-node';
import { validateEventName } from './shared';

let client: PostHog | null = null;

export function initAnalytics(apiKey: string, host = 'https://app.posthog.com') {
  client = new PostHog(apiKey, { host });
}

function getClient(safe = false) {
  if (!client && !safe) {
    throw new Error('Analytics not initialized. Call initAnalytics first.');
  }
  return client;
}

export function identify(userId: string, traits: Record<string, any>) {
  getClient(true)?.identify({
    distinctId: userId,
    properties: traits,
  });
}

export function capture(
  event: string,
  properties: Record<string, any> = {},
  options?: { userId?: string },
) {
  // Validate naming convention: app.action.object
  validateEventName(event);

  // If no user is provided, we can't capture server-side easily without anonymous ID
  // But usually servers have a userId context.
  if (!options?.userId) {
    console.warn('Analytics capture called without userId');
    return;
  }

  getClient(true)?.capture({
    distinctId: options.userId,
    event,
    properties,
  });
}

export async function shutdown() {
  await getClient(true)?.shutdown();
}
