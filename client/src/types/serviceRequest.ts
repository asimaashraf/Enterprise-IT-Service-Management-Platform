export type ServiceRequestType =
  | "Software Installation"
  | "Hardware Purchase"
  | "Email Access"
  | "VPN Access"
  | "Account Creation"
  | "Password Reset"
  | "Cloud Resource Request";

export type ServiceRequestPriority = "Low" | "Medium" | "High" | "Critical";
export type ServiceRequestStatus =
  | "Pending"
  | "Approved"
  | "In Progress"
  | "Completed"
  | "Rejected"
  | "Cancelled";

export interface ServiceRequestUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface ServiceRequest {
  _id: string;
  requestId: string;
  title: string;
  description: string;
  type: ServiceRequestType;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  requestedBy: ServiceRequestUser | string;
  assignedTo?: ServiceRequestUser | string | null;
  organizationId: string;
  approvedBy?: ServiceRequestUser | string | null;
  approvedAt?: string;
  startedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface CreateServiceRequestPayload {
  title: string;
  description: string;
  type: ServiceRequestType;
  priority?: ServiceRequestPriority;
}

export interface UpdateServiceRequestPayload {
  title?: string;
  description?: string;
  type?: ServiceRequestType;
  priority?: ServiceRequestPriority;
  status?: ServiceRequestStatus;
  assignedTo?: string;
  rejectionReason?: string;
}

export interface ServiceRequestFilters {
  search: string;
  status: string;
  type: string;
  priority: string;
  [key: string]: string;
}

export function getServiceRequestUserId(
  user: ServiceRequestUser | string | null | undefined,
): string | undefined {
  return typeof user === "string" ? user : user?._id;
}

export function getServiceRequestUserDisplay(
  user: ServiceRequestUser | string | null | undefined,
): string {
  if (!user) return "Unassigned";
  return typeof user === "string" ? user : user.name || user.email || "Unknown";
}

export function normalizeServiceRequestStatus(
  status: ServiceRequestStatus,
): string {
  return status === "In Progress" ? "in_progress" : status.toLowerCase();
}
