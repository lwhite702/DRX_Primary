import { z } from 'zod';

// Common schemas that can be used effectively in both environments
export const commonSchema = {
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development').optional(),
};

// Client-safe schemas (EXPO_PUBLIC_*)
export const clientSchema = {
  EXPO_PUBLIC_APP_NAME: z.string().default('DRX App'),
  EXPO_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  EXPO_PUBLIC_API_URL: z.string().url().optional(),

  // Vendors
  EXPO_PUBLIC_POSTHOG_KEY: z.string().optional(),
  EXPO_PUBLIC_POSTHOG_HOST: z.string().default('https://app.posthog.com'),
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
};
