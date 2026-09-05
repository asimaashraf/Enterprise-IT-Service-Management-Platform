import mongoose from "mongoose";
import AuditLog, { IAuditLog } from "./audit.model";

export const auditRepository = {
  create: async (data: Partial<IAuditLog>): Promise<IAuditLog> =>
    AuditLog.create(data),

  findByOrganization: async (
    organizationId: mongoose.Types.ObjectId
  ): Promise<IAuditLog[]> =>
    AuditLog.find({ organizationId }).sort({ createdAt: -1 }),
};
