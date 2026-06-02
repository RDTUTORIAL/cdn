import { Redis } from "@upstash/redis";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export async function checkRateLimit(key: string, prefix = "ratelimit"): Promise<boolean> {
  const r = getRedis();
  if (!r) return true; // fallback: allow if Redis not configured

  const redisKey = `${prefix}:${key}`;
  try {
    const count = await r.incr(redisKey);
    if (count === 1) {
      await r.expire(redisKey, WINDOW_SECONDS);
    }
    return count <= MAX_ATTEMPTS;
  } catch {
    return true; // allow on Redis errors (degrade gracefully)
  }
}

export async function resetRateLimit(key: string, prefix = "ratelimit"): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(`${prefix}:${key}`);
  } catch {
    // silently fail on cleanup
  }
}
