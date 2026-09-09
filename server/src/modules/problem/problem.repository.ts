import Problem, { IProblem } from "./problem.model";

const populateProblem = (query: any) => {
  return query
    .populate("reportedBy", "name email role")
    .populate("assignedTo", "name email role");
};

export const problemRepository = {
  findOne: async (
    filter: Record<string, any>
  ): Promise<IProblem | null> => {
    return Problem.findOne(filter);
  },

  create: async (
    data: Partial<IProblem>
  ): Promise<IProblem> => {
    return Problem.create(data);
  },

  findAllByOrganization: async (
    organizationId: string
  ): Promise<IProblem[]> => {
    return populateProblem(
      Problem.find({ organizationId }).sort({
        createdAt: -1,
      })
    );
  },

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IProblem | null> => {
    return populateProblem(
      Problem.findOne({
        _id: id,
        organizationId,
      })
    );
  },

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Record<string, any>
  ): Promise<IProblem | null> => {
    return populateProblem(
      Problem.findOneAndUpdate(
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
  ): Promise<IProblem | null> => {
    return Problem.findOneAndDelete({
      _id: id,
      organizationId,
    });
  },
};
