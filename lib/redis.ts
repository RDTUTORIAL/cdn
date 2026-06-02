import { Redis } from "@upstash/redis";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

let redis: Redis | null = null;

function parseRedisUrl(redisUrl: string): { url: string; token: string } | null {
  try {
    // Format: redis://default:PASSWORD@HOST:PORT
    const parsed = new URL(redisUrl);
    const token = decodeURIComponent(parsed.password || "");
    const host = parsed.hostname;
    if (!token || !host) return null;
    return { url: `https://${host}`, token };
  } catch {
    return null;
  }
}

function getRedis(): Redis | null {
  if (redis) return redis;

  // Option 1: REDIS_URL (redis://... connection string)
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const parsed = parseRedisUrl(redisUrl);
    if (parsed) {
      redis = new Redis(parsed);
      return redis;
    }
  }

  // Option 2: Upstash REST API (separate url + token)
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }

  return null;
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
