// ==========================================
// NOTIFICATION TYPES
// ==========================================

export const notificationTypes = [
  "Incident Created",
  "Incident Assigned",
  "Incident Updated",
  "Problem Assigned",
  "Problem Updated",
  "Service Request Updated",
  "Service Request Approval",
  "Change Request Updated",
  "Change Request Approval",
  "SLA Breached",
  "RCA Updated",
  "System",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

// ==========================================
// NOTIFICATION PRIORITY
// ==========================================

export const notificationPriorities = [
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

export type NotificationPriority = (typeof notificationPriorities)[number];

// ==========================================
// NOTIFICATION STATUS
// ==========================================

export type NotificationStatus =
  | "Unread"
  | "Read";

// ==========================================
// RELATED ENTITY TYPES
// ==========================================

export const notificationEntityTypes = [
  "Incident",
  "Problem",
  "ServiceRequest",
  "Change",
  "RCA",
  "SLA",
] as const;

export type NotificationEntityType =
  (typeof notificationEntityTypes)[number];
