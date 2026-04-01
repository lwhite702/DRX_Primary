"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  defineTemplate: () => defineTemplate,
  initEmail: () => initEmail,
  sendEmail: () => sendEmail,
  sendTemplate: () => sendTemplate
});
module.exports = __toCommonJS(index_exports);
var import_resend = require("resend");
var import_errors = require("@wrelik/errors");
var client;
var defaultFrom;
function initEmail(apiKey, defaultFromAddress) {
  client = new import_resend.Resend(apiKey);
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
    throw new import_errors.ValidationError(`Template ${id} not found`);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineTemplate,
  initEmail,
  sendEmail,
  sendTemplate
});
