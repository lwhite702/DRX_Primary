import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

/**
 * Cache helper for Redis
 * @param key Redis key
 * @param ttlSeconds TTL in seconds
 * @param fetcher Function to fetch data if cache miss
 * @returns Data from cache or fetcher
 */
export async function cache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redis.get<T>(key);

  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const result = await fetcher();

  if (result !== undefined && result !== null) {
    await redis.set(key, result, { ex: ttlSeconds });
  }

  return result;
}
