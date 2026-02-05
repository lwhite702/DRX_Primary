/**
 * Jobs Adapter
 *
 * Wraps @wrelik/jobs for background task execution with Inngest
 */

import { jobs } from "@wrelik/jobs";

export { jobs };

/**
 * Send an event to trigger a job
 */
export async function sendEvent(
  eventName: string,
  data: Record<string, any>,
  options?: { tenantId?: string }
) {
  return jobs.send(eventName, data, options);
}

/**
 * Create a job definition
 */
export function createJob(
  name: string,
  handler: (event: any) => Promise<any>
) {
  return jobs.create(name, handler);
}

/**
 * Schedule a one-time job
 */
export async function scheduleJob(
  eventName: string,
  data: Record<string, any>,
  delay: number,
  options?: { tenantId?: string }
) {
  return jobs.schedule(eventName, data, delay, options);
}
