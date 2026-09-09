import { Queue } from "bullmq";

import redis from "../../config/redis";

// ==========================================
// EMAIL JOB DATA
// ==========================================

export interface EmailJobData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// ==========================================
// TEST QUEUE
// ==========================================

class TestEmailQueue {
  async add(
    _name: string,
    _data: EmailJobData,
    _options?: unknown
  ): Promise<null> {
    return null;
  }

  async close(): Promise<void> {
    return;
  }
}

// ==========================================
// EMAIL QUEUE
// ==========================================

export const emailQueue =
  process.env.NODE_ENV === "test"
    ? new TestEmailQueue()
    : new Queue<EmailJobData>(
        "emails",
        {
          connection: redis,
        }
      );

// ==========================================
// QUEUE EVENTS
// ==========================================

if (process.env.NODE_ENV !== "test") {
  (
    emailQueue as Queue<EmailJobData>
  ).on(
    "error",
    (error: Error) => {
      console.error(
        "Email queue error:",
        error.message
      );
    }
  );
}

// ==========================================
// INITIALIZATION
// ==========================================

if (process.env.NODE_ENV !== "test") {
  console.log("Email queue initialized");
}

// ==========================================
// EXPORT
// ==========================================

export default emailQueue;