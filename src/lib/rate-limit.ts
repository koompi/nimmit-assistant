import { Redis } from "ioredis";
import { NextRequest, NextResponse } from "next/server";

// ===========================================
// Redis Client
// ===========================================

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL not configured - rate limiting disabled");
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
    return redis;
  } catch {
    console.error("Failed to connect to Redis for rate limiting");
    return null;
  }
}

// ===========================================
// Rate Limit Configuration
// ===========================================

export interface RateLimitConfig {
  interval: number; // Time window in seconds
  limit: number; // Max requests in window
  identifier?: (req: NextRequest) => string; // Custom identifier function
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix timestamp when window resets
  retryAfter?: number; // Seconds until allowed to retry
}

// ===========================================
// Default Limits
// ===========================================

export const RATE_LIMITS = {
  // Strict limits for auth endpoints
  auth: { interval: 60, limit: 5 }, // 5 requests per minute
  passwordReset: { interval: 300, limit: 3 }, // 3 requests per 5 minutes

  // Standard API limits
  api: { interval: 60, limit: 60 }, // 60 requests per minute
  upload: { interval: 60, limit: 10 }, // 10 uploads per minute

  // Generous limits for read operations
  read: { interval: 60, limit: 120 }, // 120 reads per minute
} as const;

// ===========================================
// Rate Limit Check
// ===========================================

/**
 * Check if a request should be rate limited
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const client = getRedis();

  // If Redis not available, allow all requests (fail open)
  if (!client) {
    return {
      allowed: true,
      remaining: config.limit,
      reset: Math.floor(Date.now() / 1000) + config.interval,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.interval;
  const redisKey = `ratelimit:${key}`;

  try {
    // Use sorted set for sliding window
    const pipeline = client.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);

    // Count requests in current window
    pipeline.zcard(redisKey);

    // Add current request
    pipeline.zadd(redisKey, now.toString(), `${now}:${Math.random()}`);

    // Set expiry on the key
    pipeline.expire(redisKey, config.interval + 1);

    const results = await pipeline.exec();

    // Get count from results (index 1 is the zcard result)
    const count = (results?.[1]?.[1] as number) || 0;
    const remaining = Math.max(0, config.limit - count - 1);
    const reset = now + config.interval;

    if (count >= config.limit) {
      return {
        allowed: false,
        remaining: 0,
        reset,
        retryAfter: config.interval,
      };
    }

    return {
      allowed: true,
      remaining,
      reset,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open on errors
    return {
      allowed: true,
      remaining: config.limit,
      reset: now + config.interval,
    };
  }
}

// ===========================================
// Rate Limit Response Helper
// ===========================================

/**
 * Create a rate limit exceeded response
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        retryAfter: result.retryAfter,
      },
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.remaining.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.reset.toString(),
        "Retry-After": (result.retryAfter || 60).toString(),
      },
    }
  );
}

// ===========================================
// Rate Limit Wrapper
// ===========================================

/**
 * Wrap an API handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = RATE_LIMITS.api
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get identifier (IP or custom)
    const identifier = config.identifier
      ? config.identifier(req)
      : getClientIdentifier(req);

    const key = `${req.nextUrl.pathname}:${identifier}`;
    const result = await checkRateLimit(key, config);

    if (!result.allowed) {
      return rateLimitExceededResponse(result);
    }

    // Add rate limit headers to response
    const response = await handler(req);

    response.headers.set("X-RateLimit-Limit", config.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.reset.toString());

    return response;
  };
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(req: NextRequest): string {
  // Try various headers for the real IP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a hash of user agent + accept headers
  const ua = req.headers.get("user-agent") || "unknown";
  const accept = req.headers.get("accept") || "unknown";
  return `anon:${hashString(ua + accept)}`;
}

/**
 * Simple hash function for fallback identifiers
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
