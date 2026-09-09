import SLA, { ISLA } from "./sla.model";

// ==========================================
// SLA REPOSITORY
// ==========================================

export const slaRepository = {
  // ==========================================
  // FIND ONE
  // ==========================================

  findOne: async (
    filter: Record<string, any>
  ): Promise<ISLA | null> => {
    return SLA.findOne(filter);
  },

  // ==========================================
  // FIND BY ID + ORGANIZATION
  // ==========================================

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<ISLA | null> => {
    return SLA.findOne({
      _id: id,
      organizationId,
    });
  },

  // ==========================================
  // FIND BY INCIDENT + ORGANIZATION
  // ==========================================

  findByIncidentAndOrganization: async (
    incidentId: string,
    organizationId: string
  ): Promise<ISLA | null> => {
    return SLA.findOne({
      incidentId,
      organizationId,
    });
  },

  // ==========================================
  // FIND ALL BY ORGANIZATION
  // ==========================================

  findAllByOrganization: async (
    organizationId: string
  ): Promise<ISLA[]> => {
    return SLA.find({
      organizationId,
    })
      .populate(
        "incidentId",
        "incidentId title priority severity status"
      )
      .sort({
        createdAt: -1,
      });
  },

  findByOrganization: async (
    organizationId: string
  ): Promise<ISLA[]> => {
    return SLA.find({
      organizationId,
    }).sort({
      createdAt: -1,
    });
  },

  findActiveWithIncidents: async (): Promise<ISLA[]> => {
    return SLA.find({
      status: {
        $in: ["Active", "Response Breached"],
      },
    }).populate(
      "incidentId",
      "incidentId title priority status reportedBy assignedTo organizationId createdAt"
    );
  },

  // ==========================================
  // FIND BY INCIDENT WITH POPULATION
  // ==========================================

  findByIncidentWithIncident: async (
    incidentId: string,
    organizationId: string
  ): Promise<ISLA | null> => {
    return SLA.findOne({
      incidentId,
      organizationId,
    }).populate(
      "incidentId",
      "incidentId title priority severity status"
    );
  },

  // ==========================================
  // CREATE
  // ==========================================

  create: async (
    data: Partial<ISLA>
  ): Promise<ISLA> => {
    return SLA.create(data);
  },

  // ==========================================
  // UPDATE BY ID + ORGANIZATION
  // ==========================================

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Record<string, any>
  ): Promise<ISLA | null> => {
    return SLA.findOneAndUpdate(
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

  claimBreachNotification: async (
    id: string,
    field: "responseBreachNotifiedAt" | "resolutionBreachNotifiedAt"
  ): Promise<ISLA | null> => {
    return SLA.findOneAndUpdate(
      {
        _id: id,
        [field]: {
          $exists: false,
        },
      },
      {
        $set: {
          [field]: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );
  },

  claimEscalationPolicy: async (
    id: string,
    policyId: string
  ): Promise<boolean> => {
    const updated = await SLA.findOneAndUpdate(
      {
        _id: id,
        escalatedPolicyIds: {
          $ne: policyId,
        },
      },
      {
        $addToSet: {
          escalatedPolicyIds: policyId,
        },
      },
      {
        returnDocument: "after",
      }
    );

    return Boolean(updated);
  },
};