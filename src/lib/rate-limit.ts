import 'server-only';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(args: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(args.key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(args.key, { count: 1, resetAt: now + args.windowMs });
    return { allowed: true };
  }

  if (bucket.count >= args.limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true };
}
