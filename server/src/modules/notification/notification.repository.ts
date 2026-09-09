import mongoose from "mongoose";

import Notification, {
  INotification,
} from "./notification.model";

// ==========================================
// NOTIFICATION REPOSITORY
// ==========================================

export const notificationRepository = {
  // ==========================================
  // CREATE
  // ==========================================

  create: async (
    data: Partial<INotification>
  ): Promise<INotification> => {
    return Notification.create(data);
  },

  // ==========================================
  // FIND USER NOTIFICATIONS
  // ==========================================

  findByUser: async (
    recipient: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId
  ): Promise<INotification[]> => {
    return Notification.find({
      recipient,
      organizationId,
    })
      .populate(
        "recipient",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });
  },

  // ==========================================
  // FIND NOTIFICATION BY ID + USER + ORG
  // ==========================================

  findByIdForUser: async (
    notificationId: mongoose.Types.ObjectId,
    recipient: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId
  ): Promise<INotification | null> => {
    return Notification.findOne({
      _id: notificationId,
      recipient,
      organizationId,
    }).populate(
      "recipient",
      "name email role"
    );
  },

  // ==========================================
  // COUNT UNREAD
  // ==========================================

  countUnread: async (
    recipient: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId
  ): Promise<number> => {
    return Notification.countDocuments({
      recipient,
      organizationId,
      status: "Unread",
    });
  },

  // ==========================================
  // MARK AS READ
  // ==========================================

  markAsRead: async (
    notificationId: mongoose.Types.ObjectId,
    recipient: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId
  ): Promise<INotification | null> => {
    return Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient,
        organizationId,
      },
      {
        $set: {
          status: "Read",
          readAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
  },

  // ==========================================
  // MARK ALL AS READ
  // ==========================================

  markAllAsRead: async (
    recipient: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId
  ) => {
    return Notification.updateMany(
      {
        recipient,
        organizationId,
        status: "Unread",
      },
      {
        $set: {
          status: "Read",
          readAt: new Date(),
        },
      }
    );
  },

  // ==========================================
  // DELETE FOR USER
  // ==========================================

  deleteForUser: async (
    notificationId: mongoose.Types.ObjectId,
    recipient: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId
  ): Promise<INotification | null> => {
    return Notification.findOneAndDelete({
      _id: notificationId,
      recipient,
      organizationId,
    });
  },
};
