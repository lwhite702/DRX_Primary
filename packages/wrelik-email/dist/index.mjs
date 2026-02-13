// src/index.ts
import { Resend } from "resend";
import { ValidationError } from "@wrelik/errors";
var client;
var defaultFrom;
function initEmail(apiKey, defaultFromAddress) {
  client = new Resend(apiKey);
  defaultFrom = defaultFromAddress;
}
function getClient() {
  if (!client) throw new Error("Email not initialized");
  return client;
}
async function sendEmail({ to, subject, html, text, from, tags }) {
  const result = await getClient().emails.send({
    from: from || defaultFrom,
    to,
    subject,
    html,
    text,
    tags,
    react: null
  });
  if (result.error) {
    throw new Error(`Failed to send email: ${result.error.message}`);
  }
  return result.data;
}
var templates = /* @__PURE__ */ new Map();
function defineTemplate(id, renderer) {
  templates.set(id, renderer);
}
async function sendTemplate(id, to, data, options) {
  const renderer = templates.get(id);
  if (!renderer) {
    throw new ValidationError(`Template ${id} not found`);
  }
  const { subject, html, text } = renderer(data);
  return sendEmail({
    to,
    subject,
    html,
    text,
    ...options
  });
}
export {
  defineTemplate,
  initEmail,
  sendEmail,
  sendTemplate
};
