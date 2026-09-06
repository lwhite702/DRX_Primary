/**
 * Jobs Adapter
 *
 * Wraps @wrelik/jobs for background task execution.
 */

import {
  emit,
  createFunction as createJobFunction,
  initJobs,
  inngest,
} from "@wrelik/jobs/server";
import { serve } from "inngest/next";

export { createJobFunction as createFunction, emit, initJobs, inngest, serve };

export const jobs = {
  emit,
  createFunction: createJobFunction,
};

/**
 * Send an event to trigger a job
 */
export async function sendEvent(
  eventName: string,
  data: Record<string, any>,
  options?: { tenantId?: string }
) {
  return emit(eventName, { ...data, tenantId: options?.tenantId });
}

/**
 * Create a job definition
 */
export function createJob(name: string, handler: (event: any) => Promise<any>) {
  return createJobFunction(name, { event: name }, handler);
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
  return emit(eventName, { ...data, tenantId: options?.tenantId, delay });
}
