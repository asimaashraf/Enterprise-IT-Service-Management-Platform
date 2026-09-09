import mongoose from "mongoose";

export const rcaUpdateFields = [
  "problem", "rootCause", "investigation", "contributingFactors",
  "correctiveActions", "preventiveActions", "lessonsLearned", "relatedIncidents", "status",
] as const;

export function inputObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be an object");
  }
  return value as Record<string, unknown>;
}

export function allowedInput(value: unknown, fields: readonly string[]): Record<string, unknown> {
  const input = inputObject(value);
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (key.includes(".") || key.startsWith("$") || !fields.includes(key)) {
      throw new Error(`Unsupported or protected field: ${key}`);
    }
    result[key] = input[key];
  }
  return result;
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a nonblank string`);
  }
  return value.trim();
}

export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value) && mongoose.Types.ObjectId.isValid(value);
}

export function validateRCAInput(value: unknown, create: boolean): Record<string, unknown> {
  const input = allowedInput(value, create
    ? [...rcaUpdateFields, "rcaId", "identifiedBy", "organizationId"]
    : rcaUpdateFields);
  for (const field of ["rootCause", "investigation", ...(create ? ["rcaId"] : [])]) {
    if (create || field in input) input[field] = requiredString(input[field], field);
  }
  for (const field of ["problem", ...(create ? ["identifiedBy", "organizationId"] : [])]) {
    if ((create || field in input) && !validId(input[field])) throw new Error(`Invalid ${field} ID`);
  }
  for (const field of ["contributingFactors", "correctiveActions", "preventiveActions", "lessonsLearned", "relatedIncidents"]) {
    if (!(field in input)) continue;
    const values = input[field];
    if (!Array.isArray(values) || values.some(value => typeof value !== "string")) {
      throw new Error(`${field} must be an array of strings`);
    }
    if (field === "relatedIncidents") {
      if (values.some(value => !validId(value))) throw new Error("Invalid incident ID");
      input[field] = [...new Set(values.map(value => value.toLowerCase()))];
    } else {
      input[field] = values.map(value => value.trim()).filter(Boolean);
    }
  }
  if ("status" in input && !["Draft", "Under Investigation", "Completed", "Approved"].includes(input.status as string)) {
    throw new Error("Invalid RCA status");
  }
  return input;
}

export function validDueDate(value: unknown): Date {
  if (!(value instanceof Date) && (typeof value !== "string" || !value.trim())) {
    throw new Error("dueDate must be a valid date string");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid corrective action due date");
  return date;
}

export function validateActionInput(value: unknown, create: boolean): Record<string, unknown> {
  const input = allowedInput(value, create
    ? ["rcaId", "title", "description", "assignedTo", "dueDate", "createdBy", "organizationId"]
    : ["title", "description", "assignedTo", "dueDate", "status"]);
  for (const field of ["title", "description"]) {
    if (create || field in input) input[field] = requiredString(input[field], field);
  }
  for (const field of ["assignedTo", ...(create ? ["rcaId", "createdBy", "organizationId"] : [])]) {
    if ((create || field in input) && !validId(input[field])) throw new Error(`Invalid ${field} ID`);
  }
  if (create || "dueDate" in input) input.dueDate = validDueDate(input.dueDate);
  if ("status" in input && !["Pending", "In Progress", "Completed", "Cancelled"].includes(input.status as string)) {
    throw new Error("Invalid corrective action status");
  }
  return input;
}
