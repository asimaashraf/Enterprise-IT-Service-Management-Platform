import Incident, { IIncident } from "./incident.model";

// ==========================================
// POPULATE INCIDENT
// ==========================================

const populateIncident = (query: any) => {
  return query
    .populate("reportedBy", "name email role")
    .populate("assignedTo", "name email role");
};

// ==========================================
// INCIDENT REPOSITORY
// ==========================================

export const incidentRepository = {
  // ==========================================
  // FIND ONE
  // ==========================================

  findOne: async (
    filter: Record<string, any>
  ): Promise<IIncident | null> => {
    return Incident.findOne(filter);
  },

  // ==========================================
  // CREATE
  // ==========================================

  create: async (
    data: Partial<IIncident>
  ): Promise<IIncident> => {
    return Incident.create(data);
  },

  // ==========================================
  // FIND ALL BY ORGANIZATION
  // ==========================================

  findAllByOrganization: async (
    organizationId: string
  ): Promise<IIncident[]> => {
    return populateIncident(
      Incident.find({ organizationId }).sort({
        createdAt: -1,
      })
    );
  },

  // ==========================================
  // FIND BY ID + ORGANIZATION
  // ==========================================

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IIncident | null> => {
    return populateIncident(
      Incident.findOne({
        _id: id,
        organizationId,
      })
    );
  },

  // ==========================================
  // UPDATE BY ID + ORGANIZATION
  // ==========================================

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Record<string, any>
  ): Promise<IIncident | null> => {
    return populateIncident(
      Incident.findOneAndUpdate(
        {
          _id: id,
          organizationId,
        },
        data,
        {
          returnDocument: "after",
          runValidators: true,
        }
      )
    );
  },

  // ==========================================
  // DELETE BY ID + ORGANIZATION
  // ==========================================

  deleteByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IIncident | null> => {
    return Incident.findOneAndDelete({
      _id: id,
      organizationId,
    });
  },

  // ==========================================
  // FIND BY TECHNICIAN
  // ==========================================

  findByTechnician: async (
    organizationId: string,
    technicianId: string
  ): Promise<IIncident[]> => {
    return Incident.find({
      organizationId,
      assignedTo: technicianId,
    }).select(
      "status createdAt resolvedAt closedAt"
    );
  },

  // ==========================================
  // COUNT BY TECHNICIAN
  // ==========================================

  countByTechnician: async (
    organizationId: string,
    technicianId: string
  ): Promise<number> => {
    return Incident.countDocuments({
      organizationId,
      assignedTo: technicianId,
    });
  },

  // ==========================================
  // FIND BY ID + ORGANIZATION
  // WITHOUT POPULATION
  //
  // Useful for internal service operations
  // where only the raw incident is required.
  // ==========================================

  findRawByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IIncident | null> => {
    return Incident.findOne({
      _id: id,
      organizationId,
    });
  },
};