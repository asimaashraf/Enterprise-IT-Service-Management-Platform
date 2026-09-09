import RCA, {
  IRCA,
} from "./rca.model";

import Problem from "../problem/problem.model";
import Incident from "../incident/incident.model";
import AuthUser from "../auth/auth.model";

export const rcaRepository = {
  // ==========================================
  // FIND ONE
  // ==========================================

  findOne: async (
    filter: Record<string, any>
  ): Promise<IRCA | null> => {
    return RCA.findOne(filter);
  },

  // ==========================================
  // CREATE
  // ==========================================

  create: async (
    data: Partial<IRCA>
  ): Promise<IRCA> => {
    return RCA.create(data);
  },

  // ==========================================
  // FIND ALL BY ORGANIZATION
  // ==========================================

  findAllByOrganization: async (
    organizationId: string
  ): Promise<IRCA[]> => {
    return RCA.find({
      organizationId,
    }).sort({
      createdAt: -1,
    });
  },

  // ==========================================
  // FIND ALL BY ORGANIZATION - POPULATED
  // ==========================================

  findAllByOrganizationPopulated: async (
    organizationId: string
  ): Promise<IRCA[]> => {
    return RCA.find({
      organizationId,
    })
      .populate({
        path: "problem",
        match: { organizationId },
        select:
          "problemId title description priority impact urgency status",
      })
      .populate({
        path: "identifiedBy",
        match: { organizationId },
        select:
          "name email role",
      })
      .populate({
        path: "relatedIncidents",
        match: { organizationId },
        select:
          "incidentId title priority severity status",
      })
      .sort({
        createdAt: -1,
      });
  },

  // ==========================================
  // FIND BY ID
  // ==========================================

  findById: async (
    id: string
  ): Promise<IRCA | null> => {
    return RCA.findById(id);
  },

  // ==========================================
  // FIND BY ID + ORGANIZATION
  // ==========================================

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IRCA | null> => {
    return RCA.findOne({
      _id: id,
      organizationId,
    });
  },

  // ==========================================
  // FIND BY ID + ORGANIZATION - POPULATED
  // ==========================================

  findByIdAndOrganizationPopulated: async (
    id: string,
    organizationId: string
  ): Promise<IRCA | null> => {
    return RCA.findOne({
      _id: id,
      organizationId,
    })
      .populate({
        path: "problem",
        match: { organizationId },
        select:
          "problemId title description priority impact urgency status rootCause",
      })
      .populate({
        path: "identifiedBy",
        match: { organizationId },
        select:
          "name email role",
      })
      .populate({
        path: "relatedIncidents",
        match: { organizationId },
        select:
          "incidentId title description priority severity status resolution",
      });
  },

  // ==========================================
  // FIND BY PROBLEM + ORGANIZATION
  // ==========================================

  findByProblemAndOrganization: async (
    problem: string,
    organizationId: string
  ): Promise<IRCA | null> => {
    return RCA.findOne({
      problem,
      organizationId,
    });
  },

  // ==========================================
  // FIND BY PROBLEM + ORGANIZATION - POPULATED
  // ==========================================

  findByProblemAndOrganizationPopulated: async (
    problem: string,
    organizationId: string
  ): Promise<IRCA | null> => {
    return RCA.findOne({
      problem,
      organizationId,
    })
      .populate({
        path: "problem",
        match: { organizationId },
        select:
          "problemId title description priority impact urgency status rootCause",
      })
      .populate({
        path: "identifiedBy",
        match: { organizationId },
        select:
          "name email role",
      })
      .populate({
        path: "relatedIncidents",
        match: { organizationId },
        select:
          "incidentId title description priority severity status resolution",
      });
  },

  // ==========================================
  // UPDATE BY ID
  // ==========================================

  updateById: async (
    id: string,
    data: Partial<IRCA>
  ): Promise<IRCA | null> => {
    return RCA.findByIdAndUpdate(
      id,
      data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
  },

  // ==========================================
  // UPDATE BY ID + ORGANIZATION
  // ==========================================

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Partial<IRCA>
  ): Promise<IRCA | null> => {
    return RCA.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
  },

  // ==========================================
  // UPDATE RCA - PROTECTED
  // ==========================================

  updateByIdAndOrganizationIfNotApproved: async (
    id: string,
    organizationId: string,
    data: Partial<IRCA>
  ): Promise<IRCA | null> => {
    return RCA.findOneAndUpdate(
      {
        _id: id,
        organizationId,
        status: {
          $ne: "Approved",
        },
      },
      {
        $set: data,
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate({
        path: "problem",
        match: { organizationId },
        select:
          "problemId title description priority impact urgency status rootCause",
      })
      .populate({
        path: "identifiedBy",
        match: { organizationId },
        select:
          "name email role",
      })
      .populate({
        path: "relatedIncidents",
        match: { organizationId },
        select:
          "incidentId title description priority severity status resolution",
      });
  },

  // ==========================================
  // DELETE BY ID
  // ==========================================

  deleteById: async (
    id: string
  ): Promise<IRCA | null> => {
    return RCA.findByIdAndDelete(id);
  },

  // ==========================================
  // DELETE BY ID + ORGANIZATION
  // ==========================================

  deleteByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IRCA | null> => {
    return RCA.findOneAndDelete({
      _id: id,
      organizationId,
    });
  },

  // ==========================================
  // DELETE BY ID + ORGANIZATION - PROTECTED
  // ==========================================

  deleteByIdAndOrganizationIfNotApproved: async (
    id: string,
    organizationId: string
  ): Promise<IRCA | null> => {
    return RCA.findOneAndDelete({
      _id: id,
      organizationId,
      status: {
        $ne: "Approved",
      },
    });
  },

  // ==========================================
  // FIND PROBLEM
  // ==========================================

  findProblem: async (
    problem: string,
    organizationId: string
  ) => {
    return Problem.findOne({
      _id: problem,
      organizationId,
    });
  },

  // ==========================================
  // FIND ACTIVE USER
  // ==========================================

  findActiveUser: async (
    userId: string,
    organizationId: string
  ) => {
    return AuthUser.findOne({
      _id: userId,
      organizationId,
      isActive: true,
    });
  },

  // ==========================================
  // FIND INCIDENTS BY ORGANIZATION
  // ==========================================

  findIncidentsByOrganization: async (
    incidentIds: string[],
    organizationId: string
  ) => {
    return Incident.find({
      _id: {
        $in: incidentIds,
      },
      organizationId,
    });
  },
};