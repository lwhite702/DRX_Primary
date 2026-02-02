declare module "@wrelik/analytics" {
  export const analytics: {
    track: (event: string, properties?: Record<string, any>) => void;
    identify: (userId: string, traits?: Record<string, any>) => void;
    init: () => void;
  };
  export const AnalyticsProvider: React.FC<{ children: React.ReactNode }>;
}

declare module "@wrelik/errors" {
  export const errorTracker: {
    captureException: (error: any, context?: any) => void;
    init: () => void;
  };
}

declare module "@wrelik/auth" {
  export const auth: any;
  export const currentUser: () => Promise<any>;
}

declare module "@wrelik/db" {
  export const db: any;
}

declare module "@wrelik/email" {
  export const email: any;
}

declare module "@wrelik/jobs" {
  export const jobs: any;
}

declare module "@wrelik/config" {
  export const config: any;
}

declare module "@wrelik/storage" {
  export const storage: any;
}
