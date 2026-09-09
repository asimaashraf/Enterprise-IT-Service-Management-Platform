import { Queue } from "bullmq";
import redis from "../config/redis";

// ==========================================
// TEST JOB QUEUE
// ==========================================

class TestJobQueue {
  async add(
    _name: string,
    _data: {
      message: string;
    },
    _options?: unknown
  ): Promise<{ id: string }> {
    return {
      id: `test-job-${Date.now()}`,
    };
  }

  async close(): Promise<void> {
    return;
  }
}

// ==========================================
// ITSM JOB QUEUE
// ==========================================

export const jobQueue =
  process.env.NODE_ENV === "test"
    ? new TestJobQueue()
    : new Queue(
        "itsm-jobs",
        {
          connection: redis,
        }
      );

// ==========================================
// TEST JOB
// ==========================================

export const addTestJob = async (data: {
  message: string;
}) => {
  const job = await jobQueue.add(
    "test-job",
    data
  );

  console.log(
    `Test job added: ${job.id}`
  );

  return job;
};