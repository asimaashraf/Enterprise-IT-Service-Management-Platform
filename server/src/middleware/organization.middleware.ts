import { Response, NextFunction } from "express";

import { AuthRequest } from "./auth.middleware";

// ==========================================
// ORGANIZATION PROTECTION
// ==========================================

export const requireOrganization = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!req.user.organizationId) {
    return res.status(403).json({
      success: false,
      message: "Organization access is required",
    });
  }

  next();
};