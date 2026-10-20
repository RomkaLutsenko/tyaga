import Redis from "ioredis";

import { readAccessMode } from "@/shared/config/flags";

export type RateBucket = "read" | "age" | "card" | "events";

type MemoryEntry = { count: number; expiresAt: number };

const memory = new Map<string, MemoryEntry>();
let redis: Redis | null = null;
let redisWarned = false;

function limitFor(bucket: RateBucket) {
  const mode = readAccessMode();
  if (mode === "open") {
    const limits: Record<RateBucket, number> = {
      read: 60,
      age: 10,
      card: 100,
      events: 60,
    };
    return limits[bucket];
  }
  if (bucket === "age" || bucket === "events") {
    return 30;
  }
  return null;
}

function memoryHit(key: string) {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.expiresAt <= now) {
    memory.set(key, { count: 1, expiresAt: now + 60_000 });
    return 1;
  }
  current.count += 1;
  return current.count;
}

async function redisHit(key: string) {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redis.on("error", () => {
      if (!redisWarned) {
        redisWarned = true;
        console.warn("redis rate limit error");
      }
    });
  }
  if (redis.status === "wait") {
    await redis.connect();
  }
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }
  return count;
}

export function clientAddress(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "local";
  }
  return req.headers.get("x-real-ip") ?? "local";
}

export async function takeRateLimit(req: Request, bucket: RateBucket) {
  const limit = limitFor(bucket);
  if (limit === null) {
    return { ok: true as const };
  }
  const key = `rl:${bucket}:${clientAddress(req)}`;
  try {
    const count =
      process.env.RATE_LIMIT_DRIVER === "memory"
        ? memoryHit(key)
        : await redisHit(key);
    if (count > limit) {
      return { ok: false as const, status: 429 as const };
    }
    return { ok: true as const };
  } catch {
    if (!redisWarned) {
      redisWarned = true;
      console.warn("redis rate limit unavailable");
    }
    return { ok: false as const, status: 503 as const };
  }
}

export function resetRateLimitForTests() {
  memory.clear();
  redisWarned = false;
}
