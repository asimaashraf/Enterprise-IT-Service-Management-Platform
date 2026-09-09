import type { Schema as MongooseSchema } from "mongoose";
import Incident from "../modules/incident/incident.model";
import ServiceRequest from "../modules/service-request/serviceRequest.model";
import Asset from "../modules/asset/asset.model";
import Change from "../modules/change/change.model";
import KnowledgeBase from "../modules/knowledge-base/knowledgeBase.model";
import RCA from "../modules/rca/rca.model";
import CorrectiveAction from "../modules/rca/rcaCorrectiveAction.model";
import Notification from "../modules/notification/notification.model";
import Organization from "../modules/organization/organization.model";
import Department from "../modules/department/department.model";
import SupportTeam from "../modules/support-team/supportTeam.model";
import Problem from "../modules/problem/problem.model";
import SLA from "../modules/sla/sla.model";
import EscalationPolicy from "../modules/incident-escalation/incidentEscalation.model";
import AssignmentRule from "../modules/incident-assignment/incidentAssignmentRule.model";
import ServiceCatalog from "../modules/service-catalog/serviceCatalog.model";
import Maintenance from "../modules/asset/assetMaintenance.model";
import Lifecycle from "../modules/asset/assetLifecycle.model";

// Response properties reuse the real Mongoose schemas; request allowlists are
// deliberately separate because persistence fields are not mutation contracts.
export type Schema = Record<string, any>;
export const str: Schema = { type: "string" };
export const id: Schema = { type: "string", pattern: "^[a-fA-F0-9]{24}$", description: "MongoDB document ID, not the human-readable record number." };
export const date: Schema = { type: "string", format: "date-time" };
export const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
export const array = (items: Schema): Schema => ({ type: "array", items });
export const object = (properties: Schema, required: string[] = []): Schema => ({ type: "object", properties, ...(required.length ? { required } : {}) });
const hidden = /^(?:__v|mutationLock|password|.*token.*|.*secret.*)$/i;
function fieldSchema(field: any): Schema {
  if (field.schema) return field.instance === "Array" ? array(modelSchema(field.schema)) : modelSchema(field.schema);
  if (field.instance === "Array") return array(fieldSchema(field.getEmbeddedSchemaType?.() || field.caster || {}));
  const types: Record<string, Schema> = { String: str, Number: { type: "number" }, Boolean: { type: "boolean" }, Date: date, ObjectId: { anyOf: [id, { type: "object", description: "Populated reference; selected fields vary by endpoint." }] } };
  return { ...(types[field.instance] || {}), ...(field.enumValues?.length ? { enum: field.enumValues } : {}), ...(typeof field.options?.min === "number" ? { minimum: field.options.min } : {}) };
}
function modelSchema(schema: MongooseSchema): Schema {
  const properties: Schema = {};
  schema.eachPath((name, field) => {
    if (hidden.test(name) || field.options.select === false) return;
    const segments = name.split(".");
    let target = properties;
    for (const segment of segments.slice(0, -1)) {
      target[segment] ||= object({});
      target = target[segment].properties;
    }
    target[segments[segments.length - 1]] = name === "_id" ? id : fieldSchema(field);
  });
  return object(properties);
}
export const schemas: Record<string, Schema> = {};
for (const [name, model] of Object.entries({ Incident, ServiceRequest, Asset, Change, KnowledgeBase, RCA, CorrectiveAction, Notification, Organization, Department, SupportTeam, Problem, SLA, EscalationPolicy, AssignmentRule, ServiceCatalog, Maintenance, Lifecycle })) schemas[name] = modelSchema(model.schema);
schemas.AuthUser = object({ id, name: str, email: { type: "string", format: "email" }, role: { type: "string", enum: ["admin", "employee"] }, organizationId: id }, ["id", "name", "email", "role", "organizationId"]);
schemas.User = object({ ...schemas.AuthUser.properties, isActive: { type: "boolean" }, isEmailVerified: { type: "boolean" }, createdAt: date, updatedAt: date });
schemas.AuthSession = object({ user: ref("AuthUser"), token: { type: "string", description: "JWT. Treat as a credential; no example token is included." } }, ["user", "token"]);
schemas.Error = object({ success: { type: "boolean", enum: [false] }, message: str }, ["success", "message"]);
schemas.Success = object({ success: { type: "boolean", enum: [true] }, message: str, count: { type: "integer" }, data: {} }, ["success"]);
const password = { type: "string", format: "password", writeOnly: true };
const email = { type: "string", format: "email" };
const role = { type: "string", enum: ["admin", "employee"] };
const token = { type: "string", writeOnly: true };
export const bodies: Record<string, Schema> = {
  registerController: object({ name: str, email, password, organizationId: id }, ["name", "email", "password", "organizationId"]),
  bootstrapController: object({ bootstrapToken: token, organizationName: str, organizationSlug: str, organizationDescription: str, name: str, email, password }, ["bootstrapToken", "organizationName", "organizationSlug", "name", "email", "password"]),
  loginController: object({ email, password }, ["email", "password"]),
  verifyEmailController: object({ token }, ["token"]),
  resendVerificationController: object({ email }, ["email"]),
  forgotPasswordController: object({ email }, ["email"]),
  resetPasswordController: object({ token, password }, ["token", "password"]),
  createUserController: object({ name: str, email, password, role }, ["name", "email", "password"]),
  updateUserController: { ...object({ name: str, email }), additionalProperties: false, description: "ADMIN only, including editing your own profile. Protected fields are rejected." },
  changeUserRoleController: object({ role }, ["role"]),
  createInvitationController: object({ email, role }, ["email", "role"]),
  acceptInvitationController: object({ token, name: str, password }, ["token", "name", "password"]),
  assignAssetController: object({ employeeId: id }, ["employeeId"]),
  createSLAController: object({ businessHours: { type: "object", description: "Optional business-hours configuration; see SLA schema and deployment/API reference." } }),
  testJob: object({ message: str }),
};
function fields(model: string, names: string[], required: string[] = []): Schema {
  const properties: Schema = {};
  for (const name of names) {
    const property = schemas[model].properties[name];
    if (!property) throw new Error(`Documentation field ${model}.${name} does not exist`);
    // References in requests are IDs; populated response objects are not inputs.
    properties[name] = property.anyOf ? id : property.type === "array" && property.items?.anyOf ? array(id) : property;
  }
  return object(properties, required);
}
const incident = ["title", "description", "priority", "severity"];
bodies.createIncidentController = fields("Incident", ["incidentId", ...incident], ["title", "description"]);
bodies.updateIncidentController = fields("Incident", [...incident, "status", "assignedTo", "resolution"]);
bodies.updateIncidentController.properties.assignedTo = { ...id, nullable: true };
const request = ["title", "description", "type", "priority"];
bodies.createServiceRequestController = fields("ServiceRequest", ["requestId", ...request], ["title", "description", "type"]);
bodies.updateServiceRequestController = fields("ServiceRequest", [...request, "status", "assignedTo", "rejectionReason"]);
const asset = ["name", "category", "description", "status", "purchaseDate", "purchasePrice", "warrantyProvider", "warrantyStartDate", "warrantyEndDate"];
bodies.createAssetController = fields("Asset", ["assetId", ...asset], ["assetId", "name", "category"]);
bodies.updateAssetController = fields("Asset", asset);
const change = ["title", "description", "type", "risk", "affectedAssets", "plannedStartAt", "plannedEndAt", "rollbackPlan"];
bodies.createChangeController = fields("Change", ["changeId", ...change], ["changeId", "title", "description"]);
bodies.updateChangeController = fields("Change", [...change, "status", "assignedTo", "approvalReason", "failureReason"]);
const kb = ["title", "content", "category", "articleType", "isPublished"];
bodies.createKnowledgeBaseController = fields("KnowledgeBase", kb, ["title", "content"]);
bodies.updateKnowledgeBaseController = fields("KnowledgeBase", kb);
const rca = ["problem", "rootCause", "investigation", "contributingFactors", "correctiveActions", "preventiveActions", "lessonsLearned", "relatedIncidents", "status"];
bodies.createRCAController = fields("RCA", ["rcaId", "identifiedBy", ...rca], ["rcaId", "problem", "rootCause", "investigation"]);
bodies.updateRCAController = { ...fields("RCA", rca), additionalProperties: false };
const action = ["title", "description", "assignedTo", "dueDate"];
bodies.createCorrectiveActionController = fields("CorrectiveAction", action, action);
bodies.updateCorrectiveActionController = { ...fields("CorrectiveAction", [...action, "status"]), additionalProperties: false };
bodies.createNotificationController = fields("Notification", ["recipient", "type", "title", "message", "priority", "relatedEntity"], ["recipient", "type", "title", "message"]);
for (const [model, create, update, names, required] of [
  ["Organization", "createOrganizationController", "updateOrganizationController", ["name", "slug", "description"], ["name", "slug"]],
  ["Department", "createDepartmentController", "updateDepartmentController", ["name", "description"], ["name"]],
  ["SupportTeam", "createSupportTeamController", "updateSupportTeamController", ["name", "members", "isActive"], ["name"]],
  ["EscalationPolicy", "createPolicy", "updatePolicy", ["name", "description", "priority", "escalationLevel", "thresholdMinutes", "targetType", "targetUser", "targetTeam", "isActive"], ["name", "priority", "escalationLevel", "thresholdMinutes", "targetType"]],
] as [string, string, string, string[], string[]][]) {
  bodies[create] = fields(model, names, required);
  bodies[update] = fields(model, names);
}

bodies.createMaintenanceRecordController = fields("Maintenance", ["date", "type", "description", "cost", "status"], ["date", "type", "description"]);
bodies.addKnowledgeBaseAttachmentController = object({ filename: str, mimeType: str, size: { type: "number", minimum: 0 }, storageKey: { type: "string", description: "Relative storage key; traversal segments are rejected." } }, ["filename", "mimeType", "size", "storageKey"]);
bodies.createSLAController = object({ businessHours: schemas.SLA.properties.businessHours });
const problem = ["title", "description", "priority", "impact", "urgency"];
bodies.createProblemController = fields("Problem", ["problemId", ...problem], ["problemId", "title", "description"]);
bodies.updateProblemController = fields("Problem", [...problem, "status", "assignedTo", "rootCause", "workaround", "resolution"]);
bodies.createServiceCatalogController = fields("ServiceCatalog", ["name", "description", "category"], ["name", "description"]);
bodies.updateServiceCatalogController = fields("ServiceCatalog", ["name", "description", "category", "isActive"]);
bodies.testNotificationJob = object({ userId: id, title: str, message: str, type: schemas.Notification.properties.type, priority: schemas.Notification.properties.priority, entityType: schemas.Notification.properties.relatedEntity.properties.entityType, entityId: id }, ["userId", "title", "message"]);
bodies.testEmailJob = object({ to: email, subject: str, text: str, html: str }, ["to", "subject"]);
const ruleFields = ["name", "description", "ruleOrder", "incidentPriority", "severity", "targetUser", "isActive"];
bodies.createRule = fields("AssignmentRule", ruleFields, ["name", "ruleOrder", "targetUser"]);
bodies.updateRule = fields("AssignmentRule", ruleFields);
