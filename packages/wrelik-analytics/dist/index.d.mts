declare function initAnalytics(apiKey: string, host?: string): void;
declare function identify(userId: string, traits: Record<string, any>): void;
declare function capture(event: string, properties?: Record<string, any>, options?: {
    userId?: string;
}): void;
declare function shutdown(): Promise<void>;

export { capture, identify, initAnalytics, shutdown };
