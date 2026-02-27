declare module "@wrelik/analytics" {
  export function initAnalytics(apiKey: string, host?: string): void;
  export function identify(userId: string, traits: Record<string, unknown>): void;
  export function capture(
    event: string,
    properties?: Record<string, unknown>,
    options?: { userId?: string }
  ): void;
  export function shutdown(): Promise<void>;
}
