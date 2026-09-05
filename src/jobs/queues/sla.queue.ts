import { Queue } from "bullmq";

import redis from "../../config/redis";

export const SLA_SCAN_JOB = "scan-sla-breaches";

export const slaQueue = new Queue(
  "sla",
  {
    connection: redis,
  }
);

if (process.env.NODE_ENV !== "test") {
  slaQueue.on("error", (error: Error) => {
    console.error("SLA queue error:", error.message);
  });
}

export const scheduleSLAScan = async (): Promise<void> => {
  await slaQueue.upsertJobScheduler(
    "sla-breach-scan",
    {
      every: Number(process.env.SLA_SCAN_INTERVAL_MS || 60000),
    },
    {
      name: SLA_SCAN_JOB,
      data: {},
      opts: {
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    }
  );
};

export default slaQueue;
