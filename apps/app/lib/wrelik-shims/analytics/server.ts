// Temporary compatibility shim until published @wrelik/analytics exports ./server.
type AnalyticsModule = {
  initAnalytics: (apiKey: string, host?: string) => void;
  identify: (userId: string, traits: Record<string, unknown>) => void;
  capture: (
    event: string,
    properties?: Record<string, unknown>,
    options?: { userId?: string }
  ) => void;
  shutdown: () => Promise<void>;
};

const analytics = require("@wrelik/analytics") as AnalyticsModule;

export const initAnalytics = analytics.initAnalytics;
export const identify = analytics.identify;
export const capture = analytics.capture;
export const shutdown = analytics.shutdown;
