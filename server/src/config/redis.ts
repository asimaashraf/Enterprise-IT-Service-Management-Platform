import IORedis from "ioredis";

// ==========================================
// REDIS CONFIGURATION
// ==========================================

const redis = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,

    // Do not keep retrying forever during Jest/test shutdown
    retryStrategy(times) {
      // In test environment, stop reconnecting after a few attempts
      if (process.env.NODE_ENV === "test" && times > 3) {
        return null;
      }

      // Production/development retry delay
      return Math.min(times * 100, 3000);
    },

    // Prevent Redis from automatically connecting during module import
    lazyConnect: true,

    // Keep connection alive during normal application runtime
    enableReadyCheck: true,
  }
);

// ==========================================
// REDIS EVENTS
// ==========================================

redis.on("connect", () => {
  if (process.env.NODE_ENV !== "test") {
    console.log("Redis connected");
  }
});

redis.on("ready", () => {
  if (process.env.NODE_ENV !== "test") {
    console.log("Redis ready");
  }
});

redis.on("error", (error) => {
  // Don't allow Redis errors to crash the application
  // or produce noisy Jest output during shutdown.
  if (process.env.NODE_ENV !== "test") {
    console.error("Redis error:", error.message);
  }
});

redis.on("close", () => {
  if (process.env.NODE_ENV !== "test") {
    console.log("Redis connection closed");
  }
});

redis.on("reconnecting", () => {
  if (process.env.NODE_ENV !== "test") {
    console.log("Redis reconnecting...");
  }
});

// ==========================================
// CONNECT REDIS
// ==========================================

export const connectRedis = async (): Promise<void> => {
  if (redis.status === "ready" || redis.status === "connecting") {
    return;
  }

  try {
    await redis.connect();

    if (process.env.NODE_ENV !== "test") {
      console.log("Redis connection established");
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error(
        "Redis connection failed:",
        error instanceof Error ? error.message : error
      );
    }

    throw error;
  }
};

// ==========================================
// CLOSE REDIS
// ==========================================

export const closeRedis = async (): Promise<void> => {
  try {
    // Already completely disconnected
    if (redis.status === "end") {
      return;
    }

    // Gracefully close an active connection
    if (
      redis.status === "ready" ||
      redis.status === "connecting" ||
      redis.status === "reconnecting"
    ) {
      await redis.quit();
    }
  } catch (error) {
    // If quit fails because the connection is already closed,
    // force disconnect instead.
    try {
      redis.disconnect();
    } catch {
      // Ignore shutdown errors
    }
  }
};

// ==========================================
// EXPORT
// ==========================================

export default redis;