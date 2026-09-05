// ==========================================
// NOTIFICATION TYPES
// ==========================================

export type NotificationType =
  | "Incident Created"
  | "Incident Assigned"
  | "Incident Updated"
  | "Problem Assigned"
  | "Problem Updated"
  | "Service Request Updated"
  | "Service Request Approval"
  | "Change Request Updated"
  | "Change Request Approval"
  | "SLA Breached"
  | "RCA Updated"
  | "System";

// ==========================================
// NOTIFICATION PRIORITY
// ==========================================

export type NotificationPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

// ==========================================
// NOTIFICATION STATUS
// ==========================================

export type NotificationStatus =
  | "Unread"
  | "Read";

// ==========================================
// RELATED ENTITY TYPES
// ==========================================

export type NotificationEntityType =
  | "Incident"
  | "Problem"
  | "ServiceRequest"
  | "Change"
  | "RCA"
  | "SLA";