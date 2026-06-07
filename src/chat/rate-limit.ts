// In-memory per-IP sliding-window limiter. First-line abuse guard for the public,
// unauthenticated /api/chat endpoint (which calls a paid LLM).
//
// LIMITATION: state is per serverless instance, so it throttles a single client
// hitting a warm instance but is not a hard global cap across many instances. For
// durable cross-instance limiting, swap this for @upstash/ratelimit backed by
// Upstash Redis (set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). The
// route depends only on the checkRateLimit() signature below, so it is a drop-in.

const WINDOW_MS = 30_000;
const MAX_HITS = 8;
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number; // seconds until the next request is allowed (0 when ok)
}

export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  const recent = (buckets.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    buckets.set(ip, recent);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  recent.push(now);
  buckets.set(ip, recent);
  return { ok: true, retryAfter: 0 };
}
