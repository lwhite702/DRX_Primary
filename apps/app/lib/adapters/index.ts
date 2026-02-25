/**
 * Wrelik Adapter Initialization
 */

import { loadServerConfig } from "@wrelik/config/server";

let initialized = false;

export async function initializeAdapters() {
  if (initialized) {
    return;
  }

  loadServerConfig();
  initialized = true;
}

export function isInitialized(): boolean {
  return initialized;
}

export function getAdapterStatus() {
  return {
    initialized,
    timestamp: new Date().toISOString(),
  };
}
