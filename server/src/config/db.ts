
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

// ==========================================
// CONNECT TO MONGODB
// ==========================================

export const connectDB = async (): Promise<void> => {
  try {
    // ========================================
    // ALREADY CONNECTED
    // ========================================

    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      return;
    }

    // ========================================
    // CONNECTION IN PROGRESS
    // ========================================

    if (mongoose.connection.readyState === 2) {
      console.log(
        "MongoDB connection already in progress"
      );

      await new Promise<void>((resolve, reject) => {
        const onConnected = () => {
          cleanup();
          resolve();
        };

        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };

        const cleanup = () => {
          mongoose.connection.off(
            "connected",
            onConnected
          );

          mongoose.connection.off(
            "error",
            onError
          );
        };

        mongoose.connection.once(
          "connected",
          onConnected
        );

        mongoose.connection.once(
          "error",
          onError
        );
      });

      return;
    }

    // ========================================
    // GET MONGO URI
    // ========================================

    const mongoUri = process.env.MONGO_URI;

    console.log(
      "MONGO_URI loaded:",
      Boolean(mongoUri)
    );

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI is missing from .env"
      );
    }

    // ========================================
    // CONNECT
    // ========================================

    const connection = await mongoose.connect(
      mongoUri,
      {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      }
    );

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error
    );

    // Do not terminate the process here.
    // The caller/test decides how to handle
    // the database connection failure.

    throw error;
  }
};

// ==========================================
// DISCONNECT FROM MONGODB
// ==========================================

export const disconnectDB =
  async (): Promise<void> => {
    try {
      if (
        mongoose.connection.readyState !== 0
      ) {
        await mongoose.disconnect();

        console.log(
          "MongoDB disconnected"
        );
      }
    } catch (error) {
      console.error(
        "MongoDB disconnection failed:",
        error
      );

      throw error;
    }
  };
