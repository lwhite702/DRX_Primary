import { Inngest, EventSchemas, type GetEvents } from 'inngest';

// Define the event types map that apps can extend via module augmentation?
// For now, we use a generic approach or require strict schemas.
// The user requirement says "Enforce event naming convention" was for analytics.
// For jobs: emit(eventName, payload), createFunction(name, trigger, handler).

let client: Inngest;

export function initJobs(appId: string, eventSchema?: any) {
  // We can pass schemas if we want strict typing
  client = new Inngest({ id: appId });
}

function getClient() {
  if (!client) throw new Error('Jobs not initialized');
  return client;
}

export async function emit(eventName: string, payload: any) {
  return getClient().send({
    name: eventName,
    data: payload,
  });
}

// Wrapper for createFunction to lock down options if needed
export function createFunction(
  name: string,
  trigger: { event: string } | { cron: string },
  handler: (args: any) => Promise<any>,
) {
  return getClient().createFunction({ id: name }, trigger, handler);
}

// Export the client for advance usage if necessary
export { client as inngest };
