import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { getAuditLogs } from "./audit.service";

export const getAuditLogsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const logs = await getAuditLogs(req.user.organizationId);

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
