/**
 * Wrelik Adapter Initialization
 *
 * This module provides centralized initialization of all Wrelik adapters.
 * All adapters are initialized once at application startup.
 */

import { config } from "@wrelik/config";

let initialized = false;

/**
 * Initialize all Wrelik adapters
 * This should be called once at application startup
 */
export async function initializeAdapters() {
  if (initialized) {
    console.warn("Adapters already initialized");
    return;
  }

  try {
    // Load configuration from environment
    const appConfig = config.load();

    // Validate required configuration
    if (!appConfig.database.url) {
      throw new Error("DATABASE_URL is required");
    }

    if (!appConfig.auth.publishableKey || !appConfig.auth.secretKey) {
      throw new Error("Clerk credentials are required");
    }

    if (!appConfig.storage.accessKeyId || !appConfig.storage.secretAccessKey) {
      throw new Error("R2 credentials are required");
    }

    if (!appConfig.analytics.key) {
      throw new Error("PostHog key is required");
    }

    if (!appConfig.errors.dsn) {
      throw new Error("Sentry DSN is required");
    }

    if (!appConfig.email.apiKey) {
      throw new Error("Resend API key is required");
    }

    if (!appConfig.jobs.eventKey || !appConfig.jobs.signingKey) {
      throw new Error("Inngest keys are required");
    }

    initialized = true;
    console.log("✅ All Wrelik adapters initialized");
  } catch (error) {
    console.error("❌ Failed to initialize adapters:", error);
    throw error;
  }
}

/**
 * Check if adapters are initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Get adapter status
 */
export function getAdapterStatus() {
  return {
    initialized,
    timestamp: new Date().toISOString(),
  };
}
