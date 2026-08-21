import { Redis } from "@upstash/redis";

type RedisEnvironment = {
  KV_REST_API_URL?: string;
  KV_REST_API_TOKEN?: string;
  VERCEL_ENV?: string;
};

export function validateRedisEnvironment(env: RedisEnvironment) {
  const hasUrl = Boolean(env.KV_REST_API_URL);
  const hasToken = Boolean(env.KV_REST_API_TOKEN);
  const isDeployed = env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "production";

  if (hasUrl !== hasToken) {
    return {
      configured: false,
      error: "KV_REST_API_URL and KV_REST_API_TOKEN must be configured together.",
    } as const;
  }

  if (isDeployed && !hasUrl) {
    return {
      configured: false,
      error: `Redis configuration is required in the ${env.VERCEL_ENV} environment.`,
    } as const;
  }

  return { configured: hasUrl && hasToken, error: null } as const;
}

const redisEnvironment = validateRedisEnvironment({
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  VERCEL_ENV: process.env.VERCEL_ENV,
});
if (redisEnvironment.error) {
  throw new Error(`[redis] ${redisEnvironment.error}`);
}

export const redis = redisEnvironment.configured
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

/** Cache through Redis when configured; local configuration-free builds fall back safely. */
export async function cache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!redis) return fetcher();

  const cached = await redis.get<T>(key);
  if (cached !== null && cached !== undefined) return cached;

  const result = await fetcher();
  if (result !== undefined && result !== null) {
    await redis.set(key, result, { ex: ttlSeconds });
  }
  return result;
}
