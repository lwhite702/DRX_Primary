import { z } from 'zod';
import { clientSchema, commonSchema } from './shared';

export * from './shared';

export function loadClientConfig<T extends z.ZodRawShape>(
  extraSchema: T = {} as T,
  env: Record<string, any> = process.env,
) {
  const mergedSchema = z.object({
    ...commonSchema,
    ...clientSchema,
    ...extraSchema,
  });

  const result = mergedSchema.safeParse(env);

  if (!result.success) {
    console.error('❌ Invalid client environment variables:', result.error.format());
    throw new Error('Invalid client environment variables');
  }

  return result.data;
}
