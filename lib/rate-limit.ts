/**
 * Simple in-memory rate limiter.
 *
 * Defense-in-depth only: on Vercel serverless, each cold start gets a fresh
 * Map, so this does not guarantee global rate limiting. The honeypot field
 * and server-side Zod validation are the primary guards.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check and consume a rate limit token for the given IP.
 *
 * @param ip - The client IP address
 * @param limit - Maximum number of requests per window
 * @param windowMs - Time window in milliseconds
 * @returns Object with `success` (whether the request is allowed) and `remaining` count
 */
export function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  // Clean up expired entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [key, val] of store.entries()) {
      if (val.resetAt <= now) {
        store.delete(key);
      }
    }
  }

  if (!entry || entry.resetAt <= now) {
    // New window
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count };
}
