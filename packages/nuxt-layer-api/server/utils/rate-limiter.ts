/**
 * Rate Limiter Utility
 *
 * In-memory sliding window rate limiter for API endpoints
 * Complements database-backed daily limits with per-second/minute limits
 *
 * Note: This is in-memory, so limits reset on server restart
 * For production with multiple instances, consider Redis
 *
 * Related: T044, TX020
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * In-memory store for rate limit tracking
 * Key format: {identifier}:{operation}
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
type RateLimitConfig = {
  /**
   * Maximum requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;
};

/**
 * Check if request is within rate limit
 *
 * @param identifier - Unique identifier (e.g., userId, IP address)
 * @param operation - Operation being rate limited
 * @param config - Rate limit configuration
 * @returns true if within limit, false if exceeded
 */
export function checkRateLimit(
  identifier: string,
  operation: string,
  config: RateLimitConfig
): boolean {
  const key = `${identifier}:${operation}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous entry - allow request
  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000
    });
    return true;
  }

  // Window has expired - reset counter
  if (now >= entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000
    });
    return true;
  }

  // Window still active - check count
  if (entry.count < config.maxRequests) {
    entry.count++;
    return true;
  }

  // Limit exceeded
  return false;
}

/**
 * Get remaining requests in current window
 *
 * @param identifier - Unique identifier
 * @param operation - Operation being rate limited
 * @param config - Rate limit configuration
 * @returns Number of requests remaining
 */
export function getRemainingRequests(
  identifier: string,
  operation: string,
  config: RateLimitConfig
): number {
  const key = `${identifier}:${operation}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    return config.maxRequests;
  }

  return Math.max(0, config.maxRequests - entry.count);
}

/**
 * Get time until rate limit reset (in seconds)
 *
 * @param identifier - Unique identifier
 * @param operation - Operation being rate limited
 * @returns Seconds until reset, or 0 if no active limit
 */
export function getResetTime(identifier: string, operation: string): number {
  const key = `${identifier}:${operation}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    return 0;
  }

  return Math.ceil((entry.resetAt - now) / 1000);
}

/**
 * Clear rate limit for identifier
 * Useful for testing or manual reset
 *
 * @param identifier - Unique identifier
 * @param operation - Optional operation (if not provided, clears all for identifier)
 */
export function clearRateLimit(identifier: string, operation?: string): void {
  if (operation) {
    const key = `${identifier}:${operation}`;
    rateLimitStore.delete(key);
  } else {
    // Clear all operations for this identifier
    const prefix = `${identifier}:`;
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(prefix)) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Clear all rate limits
 * Useful for testing
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Cleanup expired entries periodically
 * Call this from a background task or cron job
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Common rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Very strict - 1 request per second
   */
  veryStrict: { maxRequests: 1, windowSeconds: 1 },

  /**
   * Strict - 10 requests per minute
   */
  strict: { maxRequests: 10, windowSeconds: 60 },

  /**
   * Moderate - 60 requests per minute
   */
  moderate: { maxRequests: 60, windowSeconds: 60 },

  /**
   * Lenient - 100 requests per minute
   */
  lenient: { maxRequests: 100, windowSeconds: 60 },

  /**
   * Hourly - 1000 requests per hour
   */
  hourly: { maxRequests: 1000, windowSeconds: 3600 }
} as const;
