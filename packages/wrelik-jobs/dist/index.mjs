// src/index.ts
import { Inngest } from "inngest";
var client;
function initJobs(appId, eventSchema) {
  client = new Inngest({ id: appId });
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
export {
  createFunction,
  emit,
  initJobs,
  client as inngest
};
