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
  createFunction: () => createFunction,
  emit: () => emit,
  initJobs: () => initJobs,
  inngest: () => client
});
module.exports = __toCommonJS(index_exports);
var import_inngest = require("inngest");
var client;
function initJobs(appId, eventSchema) {
  client = new import_inngest.Inngest({ id: appId });
}
function getClient() {
  if (!client) throw new Error("Jobs not initialized");
  return client;
}
async function emit(eventName, payload) {
  return getClient().send({
    name: eventName,
    data: payload
  });
}
function createFunction(name, trigger, handler) {
  return getClient().createFunction({ id: name }, trigger, handler);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createFunction,
  emit,
  initJobs,
  inngest
});
