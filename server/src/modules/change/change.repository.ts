
import Change, { IChange } from "./change.model";

const populateChange = (query: any) => {
  return query
    .populate("requestedBy", "name email role")
    .populate("assignedTo", "name email role")
    .populate("approvedBy", "name email role")
    .populate("rejectedBy", "name email role")
    .populate(
      "affectedAssets",
      "assetId name category status"
    );
};

export const changeRepository = {
  findOne: async (
    filter: Record<string, any>
  ): Promise<IChange | null> => {
    return Change.findOne(filter);
  },

  create: async (
    data: Partial<IChange>
  ): Promise<IChange> => {
    return Change.create(data);
  },

  findAllByOrganization: async (
    organizationId: string
  ): Promise<IChange[]> => {
    return populateChange(
      Change.find({ organizationId }).sort({
        createdAt: -1,
      })
    );
  },

  findAllByRequesterAndOrganization: async (
    requestedBy: string,
    organizationId: string
  ): Promise<IChange[]> => {
    return populateChange(
      Change.find({
        organizationId,
        requestedBy,
      }).sort({
        createdAt: -1,
      })
    );
  },

  findByOrganization: async (
    organizationId: string
  ): Promise<IChange[]> => {
    return Change.find({
      organizationId,
    }).select("status");
  },

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IChange | null> => {
    return populateChange(
      Change.findOne({
        _id: id,
        organizationId,
      })
    );
  },

  findByIdAndRequesterAndOrganization: async (
    id: string,
    requestedBy: string,
    organizationId: string
  ): Promise<IChange | null> => {
    return populateChange(
      Change.findOne({
        _id: id,
        requestedBy,
        organizationId,
      })
    );
  },

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Record<string, any>
  ): Promise<IChange | null> => {
    return populateChange(
      Change.findOneAndUpdate(
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

  deleteByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IChange | null> => {
    return Change.findOneAndDelete({
      _id: id,
      organizationId,
    });
  },
};
