import { validateActionInput, validId } from "./rca.validation";
import { withRCAMutation } from "./rca.mutation";


import RCACorrectiveAction, {
  CorrectiveActionStatus,
  IRCAcorrectiveAction,
} from "./rcaCorrectiveAction.model";

import RCA from "./rca.model";

import AuthUser from "../auth/auth.model";

// ==========================================
// TYPES
// ==========================================

export interface CreateCorrectiveActionData {
  rcaId: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string | Date;
  createdBy: string;
  organizationId: string;
}

export interface UpdateCorrectiveActionData {
  title?: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string | Date;
  status?: CorrectiveActionStatus;
}

// ==========================================
// OBJECT ID HELPER
// ==========================================

const isValidObjectId = (
  value: string
): boolean => {
  return validId(value);
};

// ==========================================
// CHECK RCA
// ==========================================

const getRCA = async (
  rcaId: string,
  organizationId: string
) => {
  if (!isValidObjectId(rcaId)) {
    throw new Error("Invalid RCA ID");
  }

  if (!isValidObjectId(organizationId)) {
    throw new Error("Invalid organization ID");
  }

  const rca = await RCA.findOne({
    _id: rcaId,
    organizationId,
  });

  if (!rca) {
    throw new Error(
      "RCA not found or does not belong to this organization"
    );
  }

  return rca;
};

// ==========================================
// CHECK USER
// ==========================================

const getAssignedUser = async (
  userId: string,
  organizationId: string
) => {
  if (!isValidObjectId(userId)) {
    throw new Error("Invalid assigned user ID");
  }

  const user = await AuthUser.findOne({
    _id: userId,
    organizationId,
    isActive: true,
    role: "admin",
  });

  if (!user) {
    throw new Error(
      "Assigned user must be an active ADMIN in this organization"
    );
  }

  return user;
};

// ==========================================
// CREATE CORRECTIVE ACTION
// ==========================================

const createCorrectiveActionUnlocked =
  async (
    data: CreateCorrectiveActionData
  ): Promise<IRCAcorrectiveAction> => {
    const {
      rcaId,
      title,
      description,
      assignedTo,
      dueDate,
      createdBy,
      organizationId,
    } = data;

    // ==========================================
    // VALIDATE BASIC DATA
    // ==========================================

    if (!title?.trim()) {
      throw new Error(
        "Corrective action title is required"
      );
    }

    if (!description?.trim()) {
      throw new Error(
        "Corrective action description is required"
      );
    }

    if (!dueDate) {
      throw new Error(
        "Corrective action due date is required"
      );
    }

    const parsedDueDate = new Date(dueDate);

    if (
      Number.isNaN(
        parsedDueDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid corrective action due date"
      );
    }

    // ==========================================
    // CHECK RCA
    // ==========================================

    const rca = await getRCA(
      rcaId,
      organizationId
    );

    // ==========================================
    // APPROVED RCA IMMUTABILITY
    // ==========================================

    if (rca.status === "Approved") {
      throw new Error(
        "Approved RCA cannot be modified"
      );
    }

    // ==========================================
    // CHECK ASSIGNED USER
    // ==========================================

    await getAssignedUser(
      assignedTo,
      organizationId
    );

    // ==========================================
    // CHECK CREATOR
    // ==========================================

    if (!isValidObjectId(createdBy)) {
      throw new Error(
        "Invalid creator ID"
      );
    }

    const creator = await AuthUser.findOne({
      _id: createdBy,
      organizationId,
      isActive: true,
    });

    if (!creator) {
      throw new Error(
        "Creator not found, inactive, or does not belong to this organization"
      );
    }

    // ==========================================
    // CREATE
    // ==========================================

    const action =
      await RCACorrectiveAction.create({
        rca: rca._id,
        title: title.trim(),
        description: description.trim(),
        assignedTo,
        dueDate: parsedDueDate,
        status: "Pending",
        createdBy,
        organizationId,
      });

    // ==========================================
    // POPULATE
    // ==========================================

    await action.populate([
      {
        path: "assignedTo",
        match: { organizationId },
        select: "name email role",
      },
      {
        path: "createdBy",
        match: { organizationId },
        select: "name email role",
      },
      {
        path: "rca",
        match: { organizationId },
        select:
          "rcaId status problem rootCause",
      },
    ]);

    return action;
  };

// ==========================================
// GET ALL CORRECTIVE ACTIONS FOR RCA
// ==========================================

export const getCorrectiveActions =
  async (
    rcaId: string,
    organizationId: string
  ): Promise<IRCAcorrectiveAction[]> => {
    await getRCA(
      rcaId,
      organizationId
    );

    const actions =
      await RCACorrectiveAction.find({
        rca: rcaId,
        organizationId,
      })
        .populate({
          path: "assignedTo",
          match: { organizationId },
          select: "name email role",
        })
        .populate({
          path: "createdBy",
          match: { organizationId },
          select: "name email role",
        })
        .sort({
          dueDate: 1,
          createdAt: -1,
        });

    return actions;
  };

// ==========================================
// GET CORRECTIVE ACTION BY ID
// ==========================================

export const getCorrectiveActionById =
  async (
    rcaId: string,
    actionId: string,
    organizationId: string
  ): Promise<IRCAcorrectiveAction | null> => {
    await getRCA(
      rcaId,
      organizationId
    );

    if (!isValidObjectId(actionId)) {
      throw new Error(
        "Invalid corrective action ID"
      );
    }

    const action =
      await RCACorrectiveAction.findOne({
        _id: actionId,
        rca: rcaId,
        organizationId,
      })
        .populate({
          path: "assignedTo",
          match: { organizationId },
          select: "name email role",
        })
        .populate({
          path: "createdBy",
          match: { organizationId },
          select: "name email role",
        });

    return action;
  };

// ==========================================
// UPDATE CORRECTIVE ACTION
// ==========================================

const updateCorrectiveActionUnlocked =
  async (
    rcaId: string,
    actionId: string,
    organizationId: string,
    data: UpdateCorrectiveActionData
  ): Promise<IRCAcorrectiveAction | null> => {
    const rca = await getRCA(
      rcaId,
      organizationId
    );

    // ==========================================
    // APPROVED RCA IMMUTABILITY
    // ==========================================

    if (rca.status === "Approved") {
      throw new Error(
        "Approved RCA cannot be modified"
      );
    }

    if (!isValidObjectId(actionId)) {
      throw new Error(
        "Invalid corrective action ID"
      );
    }

    // ==========================================
    // FIND ACTION
    // ==========================================

    const existingAction =
      await RCACorrectiveAction.findOne({
        _id: actionId,
        rca: rcaId,
        organizationId,
      });

    if (!existingAction) {
      return null;
    }

    // ==========================================
    // BUILD UPDATE
    // ==========================================

    const updateData: any = {};

    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new Error(
          "Corrective action title cannot be empty"
        );
      }

      updateData.title =
        data.title.trim();
    }

    if (
      data.description !==
      undefined
    ) {
      if (!data.description.trim()) {
        throw new Error(
          "Corrective action description cannot be empty"
        );
      }

      updateData.description =
        data.description.trim();
    }

    // ==========================================
    // ASSIGNED USER
    // ==========================================

    if (
      data.assignedTo !==
      undefined
    ) {
      await getAssignedUser(
        data.assignedTo,
        organizationId
      );

      updateData.assignedTo =
        data.assignedTo;
    }

    // ==========================================
    // DUE DATE
    // ==========================================

    if (
      data.dueDate !==
      undefined
    ) {
      const parsedDueDate =
        new Date(data.dueDate);

      if (
        Number.isNaN(
          parsedDueDate.getTime()
        )
      ) {
        throw new Error(
          "Invalid corrective action due date"
        );
      }

      updateData.dueDate =
        parsedDueDate;
    }

    // ==========================================
    // STATUS
    // ==========================================

    if (data.status !== undefined) {
      const allowedStatuses: CorrectiveActionStatus[] =
        [
          "Pending",
          "In Progress",
          "Completed",
          "Cancelled",
        ];

      if (
        !allowedStatuses.includes(
          data.status
        )
      ) {
        throw new Error(
          "Invalid corrective action status"
        );
      }

      updateData.status =
        data.status;

      // ----------------------------------------
      // COMPLETED
      // ----------------------------------------

      if (
        data.status ===
        "Completed" && existingAction.status !== "Completed"
      ) {
        updateData.completedAt =
          new Date();
      }
    }

    // ==========================================
    // UPDATE
    // ==========================================

    const updatedAction =
      await RCACorrectiveAction.findOneAndUpdate(
        {
          _id: actionId,
          rca: rcaId,
          organizationId,
        },
        {
          $set: updateData,
          ...(data.status !== undefined && data.status !== "Completed" ? { $unset: { completedAt: 1 } } : {}),
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate({
          path: "assignedTo",
          match: { organizationId },
          select: "name email role",
        })
        .populate({
          path: "createdBy",
          match: { organizationId },
          select: "name email role",
        });

    return updatedAction;
  };

// ==========================================
// DELETE CORRECTIVE ACTION
// ==========================================

const deleteCorrectiveActionUnlocked =
  async (
    rcaId: string,
    actionId: string,
    organizationId: string
  ): Promise<IRCAcorrectiveAction | null> => {
    const rca = await getRCA(
      rcaId,
      organizationId
    );

    // ==========================================
    // APPROVED RCA IMMUTABILITY
    // ==========================================

    if (rca.status === "Approved") {
      throw new Error(
        "Approved RCA cannot be modified"
      );
    }

    if (!isValidObjectId(actionId)) {
      throw new Error(
        "Invalid corrective action ID"
      );
    }

    const deletedAction =
      await RCACorrectiveAction.findOneAndDelete(
        {
          _id: actionId,
          rca: rcaId,
          organizationId,
        }
      );

    return deletedAction;
  };

export const createCorrectiveAction = async (data: CreateCorrectiveActionData) => {
  const validated = validateActionInput(data, true) as unknown as CreateCorrectiveActionData;
  return withRCAMutation(validated.rcaId, validated.organizationId, () => createCorrectiveActionUnlocked(validated));
};

export const updateCorrectiveAction = async (id: string, actionId: string, organizationId: string, data: UpdateCorrectiveActionData) => {
  const validated = validateActionInput(data, false) as UpdateCorrectiveActionData;
  return withRCAMutation(id, organizationId, () => updateCorrectiveActionUnlocked(id, actionId, organizationId, validated));
};

export const deleteCorrectiveAction = (id: string, actionId: string, organizationId: string) =>
  withRCAMutation(id, organizationId, () => deleteCorrectiveActionUnlocked(id, actionId, organizationId));
