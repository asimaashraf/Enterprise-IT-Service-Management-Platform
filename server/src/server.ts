import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

import http from "http";

import app from "./app";
import { metricsApp } from "./observability/metrics";
import { connectDB } from "./config/db";
import { connectRedis } from "./config/redis";
import {
  initializeSocket,
  initializeSocketSubscriber,
} from "./socket/socket";

// ==========================================
// PORT
// ==========================================

const PORT =
  process.env.PORT || 5000;

// ==========================================
// CREATE HTTP SERVER
// ==========================================

const httpServer =
  http.createServer(app);

// ==========================================
// START SERVER
// ==========================================

const startServer = async (): Promise<void> => {
  try {
    // ======================================
    // CONNECT DATABASE
    // ======================================

    await connectDB();

    // ======================================
    // INITIALIZE SOCKET.IO
    // ======================================

    initializeSocket(
      httpServer
    );

    // ======================================
    // INITIALIZE REDIS PUB/SUB
    // ======================================

    await connectRedis();

    await initializeSocketSubscriber();

    // ======================================
    // START HTTP SERVER
    // ======================================

    const metricsServer = metricsApp.listen(
      Number(process.env.METRICS_PORT || 9464),
      process.env.METRICS_HOST || "127.0.0.1"
    );
    metricsServer.on("error", () => console.error("Metrics listener unavailable"));

    httpServer.listen(
      PORT,
      () => {
        console.log(
          `ITSM server running on port ${PORT}`
        );

        console.log(
          `Socket.IO running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
};

// ==========================================
// START APPLICATION
// ==========================================

startServer();