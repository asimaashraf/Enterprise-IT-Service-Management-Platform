import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { getAuditLogsController } from "./audit.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("admin"),
  getAuditLogsController
);

export default router;
