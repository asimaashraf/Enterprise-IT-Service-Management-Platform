import { Server as HttpServer } from "http";
import {
  Server as SocketIOServer,
  Socket,
} from "socket.io";
import jwt from "jsonwebtoken";

import redis from "../config/redis";

// ==========================================
// TYPES
// ==========================================

interface SocketUser {
  id: string;
  email: string;
  role: "admin" | "employee";
  organizationId: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

let io: SocketIOServer | null = null;
let subscriber: any = null;

// ==========================================
// SOCKET AUTHENTICATION MIDDLEWARE
// ==========================================

const authenticateSocket = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth?.token;

    if (!token) {
      return next(
        new Error("Authentication required")
      );
    }

    const secret =
      process.env.JWT_SECRET;

    if (!secret) {
      return next(
        new Error(
          "JWT_SECRET is not configured"
        )
      );
    }

    const decoded = jwt.verify(
      token,
      secret
    ) as SocketUser;

    if (
      !decoded.id ||
      !decoded.organizationId ||
      !decoded.email ||
      !decoded.role
    ) {
      return next(
        new Error("Invalid authentication payload")
      );
    }

    socket.user = decoded;

    next();
  } catch (error) {
    console.error(
      "Socket authentication failed"
    );

    return next(
      new Error("Invalid or expired token")
    );
  }
};

// ==========================================
// INITIALIZE SOCKET.IO
// ==========================================

export const initializeSocket = (
  server: HttpServer
): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin:
        process.env.CLIENT_URL ||
        "http://localhost:5173",

      credentials: true,

      methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
      ],
    },
  });

  // ========================================
  // SOCKET AUTHENTICATION
  // ========================================

  io.use(
    authenticateSocket as any
  );

  // ========================================
  // SOCKET CONNECTION
  // ========================================

  io.on(
    "connection",
    (socket: Socket) => {
      const authenticatedSocket =
        socket as AuthenticatedSocket;

      const user =
        authenticatedSocket.user;

      if (!user) {
        socket.disconnect(true);
        return;
      }

      console.log(
        "Socket connected:",
        socket.id
      );

      console.log(
        "Authenticated user:",
        user.id
      );

      console.log(
        "Organization:",
        user.organizationId
      );

      // ======================================
      // AUTOMATIC USER ROOM
      // ======================================

      const userRoom =
        `user:${user.id}`;

      socket.join(userRoom);

      console.log(
        `Socket ${socket.id} joined ${userRoom}`
      );

      // ======================================
      // AUTOMATIC ORGANIZATION ROOM
      // ======================================

      const organizationRoom =
        `organization:${user.organizationId}`;

      socket.join(
        organizationRoom
      );

      console.log(
        `Socket ${socket.id} joined ${organizationRoom}`
      );

      // ======================================
      // SOCKET READY EVENT
      // ======================================

      socket.emit(
        "socket-ready",
        {
          userId: user.id,
          organizationId:
            user.organizationId,
        }
      );

      // ======================================
      // DISCONNECT
      // ======================================

      socket.on(
        "disconnect",
        (reason) => {
          console.log(
            `Socket disconnected: ${socket.id}`,
            reason
          );
        }
      );
    }
  );

  console.log(
    "Socket.IO initialized"
  );

  return io;
};

// ==========================================
// INITIALIZE REDIS PUB/SUB
// ==========================================

export const initializeSocketSubscriber =
  async (): Promise<void> => {
    if (!io) {
      throw new Error(
        "Socket.IO must be initialized before Redis subscriber"
      );
    }

    // ========================================
    // CREATE DEDICATED SUBSCRIBER
    // ========================================

    subscriber =
      redis.duplicate();

    subscriber.on(
      "connect",
      () => {
        console.log(
          "Socket Redis subscriber connected"
        );
      }
    );

    subscriber.on(
      "ready",
      () => {
        console.log(
          "Socket Redis subscriber ready"
        );
      }
    );

    subscriber.on(
      "error",
      (error: Error) => {
        console.error(
          "Socket Redis subscriber error:",
          error.message
        );
      }
    );

    // ========================================
    // SUBSCRIBE TO NOTIFICATIONS
    // ========================================

    await subscriber.subscribe(
      "notification:realtime"
    );

    console.log(
      "Subscribed to notification:realtime"
    );

    // ========================================
    // RECEIVE REDIS EVENTS
    // ========================================

    subscriber.on(
      "message",
      (
        channel: string,
        rawMessage: string
      ) => {
        if (
          channel !==
          "notification:realtime"
        ) {
          return;
        }

        try {
          const payload =
            JSON.parse(rawMessage);

          const {
            userId,
            event,
            data,
          } = payload;

          if (!userId) {
            console.warn(
              "Real-time notification missing userId"
            );

            return;
          }

          if (!event) {
            console.warn(
              "Real-time notification missing event"
            );

            return;
          }

          // ==================================
          // EMIT TO USER ROOM
          // ==================================

          emitToUser(
            userId,
            event,
            data
          );

          console.log(
            "Real-time notification emitted through Socket.IO"
          );

          console.log(
            "Event:",
            event
          );

          console.log(
            "Recipient room:",
            `user:${userId}`
          );
        } catch (error: any) {
          console.error(
            "Failed to process Redis notification:",
            error.message
          );
        }
      }
    );
  };

// ==========================================
// GET SOCKET.IO INSTANCE
// ==========================================

export const getIO =
  (): SocketIOServer => {
    if (!io) {
      throw new Error(
        "Socket.IO has not been initialized"
      );
    }

    return io;
  };

// ==========================================
// EMIT TO USER
// ==========================================

export const emitToUser = (
  userId: string,
  event: string,
  data: unknown
): void => {
  getIO()
    .to(`user:${userId}`)
    .emit(event, data);
};

// ==========================================
// EMIT TO ORGANIZATION
// ==========================================

export const emitToOrganization = (
  organizationId: string,
  event: string,
  data: unknown
): void => {
  getIO()
    .to(`organization:${organizationId}`)
    .emit(event, data);
};