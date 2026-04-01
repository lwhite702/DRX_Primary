import { z } from 'zod';

declare const commonSchema: {
    NODE_ENV: z.ZodOptional<z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>>;
};
declare const clientSchema: {
    EXPO_PUBLIC_APP_NAME: z.ZodDefault<z.ZodString>;
    EXPO_PUBLIC_APP_ENV: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    EXPO_PUBLIC_API_URL: z.ZodOptional<z.ZodString>;
    EXPO_PUBLIC_POSTHOG_KEY: z.ZodOptional<z.ZodString>;
    EXPO_PUBLIC_POSTHOG_HOST: z.ZodDefault<z.ZodString>;
    EXPO_PUBLIC_SENTRY_DSN: z.ZodOptional<z.ZodString>;
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.ZodOptional<z.ZodString>;
};

export { clientSchema as a, commonSchema as c };
