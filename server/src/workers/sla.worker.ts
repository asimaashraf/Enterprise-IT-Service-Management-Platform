import { Job, Worker } from "bullmq";

import redis from "../config/redis";
import { SLA_SCAN_JOB } from "../jobs/queues/sla.queue";
import { scanSLABreaches } from "../modules/sla/sla.service";

const slaWorker = new Worker(
  "sla",
  async (job: Job) => {
    if (job.name !== SLA_SCAN_JOB) {
      return;
    }

    return scanSLABreaches();
  },
  {
    connection: redis,
    concurrency: 1,
  }
);

slaWorker.on("error", (error: Error) => {
  console.error("SLA worker error:", error.message);
});

export default slaWorker;
