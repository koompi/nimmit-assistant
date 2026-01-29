import IORedis from "ioredis";

// ===========================================
// Redis Connection Configuration
// ===========================================

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create a singleton Redis connection for BullMQ
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Connection error handling
connection.on("error", (error) => {
  console.error("[Queue] Redis connection error:", error);
});

connection.on("connect", () => {
  console.log("[Queue] Redis connected");
});

connection.on("close", () => {
  console.log("[Queue] Redis connection closed");
});

// Graceful shutdown
const close = async () => {
  await connection.quit();
  console.log("[Queue] Redis connection closed gracefully");
};

// ===========================================
// Export
// ===========================================

export { connection, close };

// Export for testing
export const getRedisUrl = () => REDIS_URL;