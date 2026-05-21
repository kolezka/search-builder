type Bucket = { count: number; resetAt: number };

export function rateLimit(opts: { max: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>();
  return {
    check(key: string): { allowed: boolean; remaining: number; retryAfter?: number } {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { allowed: true, remaining: opts.max - 1 };
      }
      if (bucket.count >= opts.max) {
        return { allowed: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
      }
      bucket.count += 1;
      return { allowed: true, remaining: opts.max - bucket.count };
    },
  };
}
