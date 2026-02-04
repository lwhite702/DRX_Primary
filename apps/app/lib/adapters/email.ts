/**
 * Email Adapter
 *
 * Wraps @wrelik/email for email sending with Resend
 */

import { email } from "@wrelik/email";

export { email };

/**
 * Send an email
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  tenantId?: string;
}) {
  return email.send(params);
}

/**
 * Send a templated email
 */
export async function sendTemplatedEmail(params: {
  to: string | string[];
  templateId: string;
  variables?: Record<string, any>;
  from?: string;
  tenantId?: string;
}) {
  return email.sendTemplated(params);
}
