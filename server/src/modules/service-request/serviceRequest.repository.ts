import ServiceRequest, {
  IServiceRequest,
} from "./serviceRequest.model";

export const serviceRequestRepository = {
  // ==========================================
  // FIND ONE
  // ==========================================

  findOne: async (
    filter: Record<string, any>
  ): Promise<IServiceRequest | null> => {
    return ServiceRequest.findOne(filter);
  },

  // ==========================================
  // CREATE
  // ==========================================

  create: async (
    data: Partial<IServiceRequest>
  ): Promise<IServiceRequest> => {
    return ServiceRequest.create(data);
  },

  // ==========================================
  // FIND ALL BY ORGANIZATION
  // ==========================================

  findAllByOrganization: async (
    organizationId: string
  ): Promise<IServiceRequest[]> => {
    return ServiceRequest.find({
      organizationId,
    })
      .populate(
        "requestedBy",
        "name email role"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .populate(
        "approvedBy",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });
  },

  // ==========================================
  // FIND BY ID + ORGANIZATION
  // ==========================================

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IServiceRequest | null> => {
    return ServiceRequest.findOne({
      _id: id,
      organizationId,
    })
      .populate(
        "requestedBy",
        "name email role"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .populate(
        "approvedBy",
        "name email role"
      );
  },

  // ==========================================
  // FIND EXISTING REQUEST
  // ==========================================

  findExistingByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IServiceRequest | null> => {
    return ServiceRequest.findOne({
      _id: id,
      organizationId,
    });
  },

  // ==========================================
  // UPDATE BY ID + ORGANIZATION
  // ==========================================

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Record<string, any>
  ): Promise<IServiceRequest | null> => {
    return ServiceRequest.findOneAndUpdate(
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
      .populate(
        "requestedBy",
        "name email role"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .populate(
        "approvedBy",
        "name email role"
      );
  },

  // ==========================================
  // DELETE BY ID + ORGANIZATION
  // ==========================================

  deleteByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IServiceRequest | null> => {
    return ServiceRequest.findOneAndDelete({
      _id: id,
      organizationId,
    });
  },
};