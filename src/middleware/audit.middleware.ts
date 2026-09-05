import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth.middleware";
import { createAuditLog } from "../modules/audit/audit.service";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const resourceTypeFromPath = (path: string): string => {
  const segment = path
    .split("/")
    .filter(Boolean)
    .find((value) => value !== "api" && value !== "v1");

  if (!segment) {
    return "Unknown";
  }

  return segment
    .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    .replace(/s$/, "")
    .replace(/^./, (letter) => letter.toUpperCase());
};

const getResourceId = (req: AuthRequest, responseBody: unknown) => {
  if (req.params.id) {
    return String(req.params.id);
  }

  if (responseBody && typeof responseBody === "object") {
    const data = (responseBody as { data?: { _id?: unknown } }).data;

    if (data?._id) {
      return String(data._id);
    }
  }

  return undefined;
};

const getOrganizationId = (req: AuthRequest, responseBody: unknown) => {
  if (req.user?.organizationId) {
    return req.user.organizationId;
  }

  if (req.body?.organizationId) {
    return String(req.body.organizationId);
  }

  if (responseBody && typeof responseBody === "object") {
    const data = (responseBody as { data?: { organizationId?: unknown } }).data;

    if (data?.organizationId) {
      return String(data.organizationId);
    }

    const user = (data as { user?: { organizationId?: unknown } } | undefined)?.user;

    if (user?.organizationId) {
      return String(user.organizationId);
    }
  }

  return undefined;
};

export const auditMutations = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!mutationMethods.has(req.method)) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    const organizationId = getOrganizationId(req, body);
    const resourceType = resourceTypeFromPath(req.path);
    const outcome: "Success" | "Failure" = res.statusCode < 400 ? "Success" : "Failure";
    const action = `${req.method} ${resourceType}`;

    if (organizationId) {
      void createAuditLog({
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        organizationId,
        action,
        eventType: `${resourceType}.${req.method}`,
        resourceType,
        resourceId: getResourceId(req, body),
        outcome,
        metadata: {
          route: req.path,
          statusCode: res.statusCode,
          requestFields: Object.keys(req.body || {}),
          responseSuccess:
            body && typeof body === "object"
              ? (body as { success?: unknown }).success
              : undefined,
          errorMessage:
            outcome === "Failure" && body && typeof body === "object"
              ? (body as { message?: unknown }).message
              : undefined,
        },
      }).catch((error: unknown) => {
        console.error("Failed to create audit log:", error);
      });
    }

    return originalJson(body);
  }) as Response["json"];

  next();
};
