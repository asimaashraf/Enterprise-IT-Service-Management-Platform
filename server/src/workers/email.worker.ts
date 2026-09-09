import { Worker, Job } from "bullmq";

import redis from "../config/redis";
import {
  EmailJobData,
} from "../jobs/queues/email.queue";
import { sendEmail } from "../services/email.service";

// ==========================================
// EMAIL WORKER
// ==========================================

const emailWorker =
  new Worker<EmailJobData>(
    "emails",

    async (
      job: Job<EmailJobData>
    ) => {
      console.log(
        "=========================================="
      );

      console.log(
        "Processing email job"
      );

      console.log(
        "Job ID:",
        job.id
      );

      console.log(
        "Job Name:",
        job.name
      );

      console.log(
        "Recipient:",
        job.data.to
      );

      console.log(
        "Subject:",
        job.data.subject
      );

      console.log(
        "=========================================="
      );

      // ========================================
      // VALIDATE EMAIL DATA
      // ========================================

      const {
        to,
        subject,
        text,
        html,
      } = job.data;

      if (!to) {
        throw new Error(
          "Email recipient is required"
        );
      }

      if (!subject) {
        throw new Error(
          "Email subject is required"
        );
      }

      if (!text && !html) {
        throw new Error(
          "Email must contain text or html content"
        );
      }

      // ========================================
      // SEND EMAIL
      // ========================================

      const result =
        await sendEmail({
          to,
          subject,
          text,
          html,
        });

      // ========================================
      // SUCCESS LOG
      // ========================================

      console.log(
        "Email job completed successfully"
      );

      console.log(
        "Message ID:",
        result.messageId
      );

      console.log(
        "=========================================="
      );

      return {
        success: true,
        messageId: result.messageId,
        recipient: to,
      };
    },

    {
      connection: redis,

      concurrency: 5,
    }
  );

// ==========================================
// WORKER EVENTS
// ==========================================

emailWorker.on(
  "ready",
  () => {
    console.log(
      "Email worker ready"
    );
  }
);

emailWorker.on(
  "completed",
  (job) => {
    console.log(
      `Email job completed: ${job.id}`
    );
  }
);

emailWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `Email job failed: ${job?.id}`,
      error.message
    );
  }
);

emailWorker.on(
  "error",
  (error) => {
    console.error(
      "Email worker error:",
      error.message
    );
  }
);

// ==========================================
// EXPORT
// ==========================================

export default emailWorker;