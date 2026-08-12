type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) { const existing = buckets.get(key); const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing; bucket.count += 1; buckets.set(key, bucket); return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt }; }
export function resetRateLimits() { buckets.clear(); }
