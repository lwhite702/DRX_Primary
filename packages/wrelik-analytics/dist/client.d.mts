export { default as _posthog } from 'posthog-js';

/**
 * Client-side (browser) analytics adapter
 * Wraps posthog-js for browser environments
 */

interface AnalyticsConfig {
    apiKey: string;
    host?: string;
    capturePageview?: boolean;
    persistence?: "localStorage" | "localStorage+cookie" | "cookie" | "memory";
    autocapture?: boolean;
}
declare function initAnalytics(config: AnalyticsConfig): void;
declare function identify(userId: string, traits?: Record<string, any>): void;
declare function capture(event: string, properties?: Record<string, any>): void;
declare function capturePageView(url: string, properties?: Record<string, any>): void;
declare function setUserProperties(properties: Record<string, any>): void;
declare function reset(): void;
declare function isFeatureEnabled(flagKey: string, defaultValue?: boolean): boolean;
declare function getFeatureFlag(flagKey: string): string | boolean | undefined;
declare function onFeatureFlags(callback: () => void): void;
declare function reloadFeatureFlags(): void;

export { type AnalyticsConfig, capture, capturePageView, getFeatureFlag, identify, initAnalytics, isFeatureEnabled, onFeatureFlags, reloadFeatureFlags, reset, setUserProperties };
