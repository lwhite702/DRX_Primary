/**
 * Email Adapter
 *
 * Wraps @wrelik/email utilities.
 */

import {
  sendEmail as sendEmailRaw,
  sendTemplate,
  type SendEmailOptions,
} from "@wrelik/email";

/**
 * Send an email
 */
export async function sendEmail(params: SendEmailOptions & { tenantId?: string }) {
  const { tenantId, ...emailParams } = params;
  void tenantId;
  return sendEmailRaw(emailParams);
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
  const { to, templateId, variables = {}, from } = params;
  return sendTemplate(templateId, to, variables, { from });
}
