import express from "express";

import {
  testJob,
  testNotificationJob,
} from "./jobs.controller";

import {
  testEmailJob,
} from "./email-test.controller";

import { authenticate, authorize } from "../../middleware/auth.middleware";

const router = express.Router();

// ==========================================
// TEST BACKGROUND JOB
// ==========================================

router.post(
  "/test",
  authenticate,
  testJob
);

// ==========================================
// TEST NOTIFICATION JOB
// ==========================================

router.post(
  "/test-notification",
  authenticate,
  authorize("admin"),
  testNotificationJob
);

// ==========================================
// TEST EMAIL JOB
// ==========================================

router.post(
  "/test-email",
  authenticate,
  authorize("admin"),
  testEmailJob
);

export default router;
