import { z } from 'zod';
export { c as clientSchema, a as commonSchema } from './shared-D4fnBEvF.mjs';

declare function loadClientConfig<T extends z.ZodRawShape>(extraSchema?: T, env?: Record<string, any>): z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    EXPO_PUBLIC_APP_NAME: z.ZodDefault<z.ZodString>;
    EXPO_PUBLIC_APP_ENV: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    EXPO_PUBLIC_API_URL: z.ZodOptional<z.ZodString>;
    EXPO_PUBLIC_POSTHOG_KEY: z.ZodOptional<z.ZodString>;
    EXPO_PUBLIC_POSTHOG_HOST: z.ZodDefault<z.ZodString>;
    EXPO_PUBLIC_SENTRY_DSN: z.ZodOptional<z.ZodString>;
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodOptional<z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>>;
} & T>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never;

export { loadClientConfig };
