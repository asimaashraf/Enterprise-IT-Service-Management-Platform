import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";

import {
  testEmailJob,
} from "./email-test.controller";

const router = Router();

// ==========================================
// EMAIL TEST ROUTE
// ==========================================

router.post(
  "/test-email",
  authenticate,
  testEmailJob
);

export default router;