import { Queue } from "bullmq";

import redis from "../../config/redis";

// ==========================================
// TYPES
// ==========================================

export interface NotificationJobData {
  notificationId?: string;
  userId: string;
  organizationId: string;

  title: string;
  message: string;

  type:
    | "Incident Created"
    | "Incident Assigned"
    | "Incident Updated"
    | "Problem Assigned"
    | "Problem Updated"
    | "Service Request Updated"
    | "Service Request Approval"
    | "Change Request Updated"
    | "Change Request Approval"
    | "SLA Breached"
    | "RCA Updated"
    | "System";

  entityType?:
    | "Incident"
    | "Problem"
    | "ServiceRequest"
    | "Change"
    | "RCA"
    | "SLA";

  entityId?: string;

  priority?:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";
}

// ==========================================
// TEST QUEUE
// ==========================================

class TestNotificationQueue {
  async add(
    _name: string,
    _data: NotificationJobData,
    _options?: unknown
  ): Promise<{ id: string }> {
    return {
      id: `test-notification-${Date.now()}`,
    };
  }

  async close(): Promise<void> {
    return;
  }
}

// ==========================================
// NOTIFICATION QUEUE
// ==========================================

export const notificationQueue =
  process.env.NODE_ENV === "test"
    ? new TestNotificationQueue()
    : new Queue<NotificationJobData>(
        "notifications",
        {
          connection: redis,
        }
      );

// ==========================================
// QUEUE EVENTS
// ==========================================

if (process.env.NODE_ENV !== "test") {
  (
    notificationQueue as Queue<NotificationJobData>
  ).on(
    "error",
    (error: Error) => {
      console.error(
        "Notification queue error:",
        error.message
      );
    }
  );
}

// ==========================================
// INITIALIZATION
// ==========================================

if (process.env.NODE_ENV !== "test") {
  console.log(
    "Notification queue initialized"
  );
}

// ==========================================
// EXPORT
// ==========================================

export default notificationQueue;