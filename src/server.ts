import dotenv from "dotenv";

dotenv.config();

import http from "http";

import app from "./app";
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