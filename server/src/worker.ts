import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";

import redis from "./config/redis";

import notificationWorker from "./workers/notification.worker";
import emailWorker from "./workers/email.worker";
import slaWorker from "./workers/sla.worker";
import { scheduleSLAScan } from "./jobs/queues/sla.queue";

// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

// ==========================================
// START BACKGROUND WORKERS
// ==========================================

const startWorkers = async (): Promise<void> => {
  try {
    console.log(
      "=========================================="
    );

    console.log(
      "ITSM Background Workers Starting..."
    );

    console.log(
      "=========================================="
    );

    // ========================================
    // ENVIRONMENT VALIDATION
    // ========================================

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is not configured"
      );
    }

    // ========================================
    // REDIS
    // ========================================

    console.log(
      "Connecting to Redis..."
    );

    await redis.ping();

    console.log(
      "Redis connected"
    );

    console.log(
      "Redis ready"
    );

    // ========================================
    // MONGODB
    // ========================================

    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected"
    );

    // ========================================
    // NOTIFICATION WORKER
    // ========================================

    console.log(
      `Notification worker started: ${notificationWorker.name}`
    );

    // ========================================
    // EMAIL WORKER
    // ========================================

    console.log(
      `Email worker started: ${emailWorker.name}`
    );

    await scheduleSLAScan();

    console.log(
      "SLA breach scheduler started"
    );

    // ========================================
    // WORKERS READY
    // ========================================

    console.log(
      "=========================================="
    );

    console.log(
      "ITSM Background Workers Started Successfully"
    );

    console.log(
      "Notification Worker: READY"
    );

    console.log(
      "Email Worker: READY"
    );

    console.log(
      "=========================================="
    );
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "Worker startup failed:",
      error.message
    );

    console.error(
      "=========================================="
    );

    process.exit(1);
  }
};

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const shutdown = async (
  signal: string
): Promise<void> => {
  console.log(
    `\n${signal} received. Shutting down workers...`
  );

  try {
    // ========================================
    // CLOSE NOTIFICATION WORKER
    // ========================================

    await notificationWorker.close();

    console.log(
      "Notification worker closed"
    );

    // ========================================
    // CLOSE EMAIL WORKER
    // ========================================

    await emailWorker.close();

    console.log(
      "Email worker closed"
    );

    await slaWorker.close();

    console.log(
      "SLA worker closed"
    );

    // ========================================
    // CLOSE MONGODB
    // ========================================

    await mongoose.connection.close();

    console.log(
      "MongoDB connection closed"
    );

    // ========================================
    // CLOSE REDIS
    // ========================================

    await redis.quit();

    console.log(
      "Redis connection closed"
    );

    console.log(
      "Worker shutdown completed"
    );

    process.exit(0);
  } catch (error: any) {
    console.error(
      "Worker shutdown failed:",
      error.message
    );

    process.exit(1);
  }
};

// ==========================================
// PROCESS SIGNALS
// ==========================================

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

// ==========================================
// START
// ==========================================

startWorkers();