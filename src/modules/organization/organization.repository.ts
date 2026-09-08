import Organization, {
  IOrganization,
} from "./organization.model";
import mongoose from "mongoose";
import AuthUser from "../auth/auth.model";
import Department from "../department/department.model";
import SupportTeam from "../support-team/supportTeam.model";
import Incident from "../incident/incident.model";
import ServiceRequest from "../service-request/serviceRequest.model";
import Change from "../change/change.model";
import Asset from "../asset/asset.model";
import Problem from "../problem/problem.model";
import RCA from "../rca/rca.model";
import KnowledgeBase from "../knowledge-base/knowledgeBase.model";
import Notification from "../notification/notification.model";
import AuditLog from "../audit/audit.model";
import SLA from "../sla/sla.model";
import IncidentAssignmentRule from "../incident-assignment/incidentAssignmentRule.model";
import IncidentEscalationPolicy from "../incident-escalation/incidentEscalation.model";
import Invitation from "../invitation/invitation.model";
import ServiceCatalog from "../service-catalog/serviceCatalog.model";

export const organizationRepository = {
  create: async (data: Partial<IOrganization>) => {
    return Organization.create(data);
  },

  findAll: async (): Promise<IOrganization[]> => {
    return Organization.find().sort({ createdAt: -1 });
  },

  findById: async (
    id: string
  ): Promise<IOrganization | null> => {
    return Organization.findById(id);
  },

  findOne: async (
    filter: Record<string, any>
  ): Promise<IOrganization | null> => {
    return Organization.findOne(filter);
  },

  updateById: async (
    id: string,
    data: Partial<IOrganization>
  ): Promise<IOrganization | null> => {
    return Organization.findByIdAndUpdate(
      id,
      data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
  },

  deleteById: async (
    id: string
  ): Promise<IOrganization | null> => {
    return Organization.findByIdAndDelete(id);
  },

  hasDependents: async (id: string): Promise<boolean> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const organizationId = new mongoose.Types.ObjectId(id);
    const models: Array<{ exists: (filter: Record<string, unknown>) => Promise<unknown> }> = [
      AuthUser,
      Department,
      SupportTeam,
      Incident,
      ServiceRequest,
      Change,
      Asset,
      Problem,
      RCA,
      KnowledgeBase,
      Notification,
      AuditLog,
      SLA,
      IncidentAssignmentRule,
      IncidentEscalationPolicy,
      Invitation,
      ServiceCatalog,
    ];

    for (const model of models) {
      if (await model.exists({ organizationId })) return true;
    }
    return false;
  },
};
