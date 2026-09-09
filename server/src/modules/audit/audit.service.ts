import mongoose from "mongoose";
import { auditRepository } from "./audit.repository";
import { AuditOutcome } from "./audit.model";

export interface CreateAuditLogData {
  actorId?: string;
  actorEmail?: string;
  actorRole?: "admin" | "employee";
  organizationId: string;
  action: string;
  eventType: string;
  resourceType: string;
  resourceId?: string;
  outcome: AuditOutcome;
  metadata?: Record<string, unknown>;
}

const sensitiveKeyPattern = /(password|token|secret|authorization|cookie|apikey|api_key|jwt)/i;

const sanitizeMetadata = (
  value: unknown,
  key?: string
): unknown => {
  if (key && sensitiveKeyPattern.test(key)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeMetadata(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [childKey, childValue] of Object.entries(value)) {
      const result = sanitizeMetadata(childValue, childKey);

      if (result !== undefined) {
        sanitized[childKey] = result;
      }
    }

    return sanitized;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return undefined;
};

const validateObjectId = (id: string, field: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${field}`);
  }

  return new mongoose.Types.ObjectId(id);
};

export const createAuditLog = async (data: CreateAuditLogData) => {
  const organizationId = validateObjectId(
    data.organizationId,
    "organization ID"
  );

  const actorId = data.actorId
    ? validateObjectId(data.actorId, "actor ID")
    : undefined;

  return auditRepository.create({
    actorId,
    actorEmail: data.actorEmail,
    actorRole: data.actorRole,
    organizationId,
    action: data.action,
    eventType: data.eventType,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    outcome: data.outcome,
    metadata: (sanitizeMetadata(data.metadata) || {}) as Record<
      string,
      unknown
    >,
  });
};

export const getAuditLogs = async (organizationId: string) => {
  return auditRepository.findByOrganization(
    validateObjectId(organizationId, "organization ID")
  );
};
