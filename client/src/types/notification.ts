export const notificationTypes = [
  'Incident Created',
  'Incident Assigned',
  'Incident Updated',
  'Problem Assigned',
  'Problem Updated',
  'Service Request Updated',
  'Service Request Approval',
  'Change Request Updated',
  'Change Request Approval',
  'SLA Breached',
  'RCA Updated',
  'System',
] as const

export type NotificationType = (typeof notificationTypes)[number]
export type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type NotificationStatus = 'Unread' | 'Read'
export type NotificationEntityType =
  | 'Incident'
  | 'Problem'
  | 'ServiceRequest'
  | 'Change'
  | 'RCA'
  | 'SLA'

export interface NotificationRelatedEntity {
  entityType: NotificationEntityType
  entityId: string
}

export interface NotificationRecipient {
  _id: string
  name: string
  email: string
  role: 'admin' | 'employee'
}

export interface Notification {
  _id?: string
  notificationId: string
  recipient: string | NotificationRecipient
  organizationId: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  status: NotificationStatus
  relatedEntity?: NotificationRelatedEntity
  readAt?: string
  createdAt: string
  updatedAt: string
}

export interface NotificationUnreadCount {
  unreadCount: number
}

export interface NotificationMarkAllResult {
  acknowledged: boolean
  matchedCount: number
  modifiedCount: number
}

export interface NotificationRealtimePayload {
  _id?: unknown
  notificationId?: unknown
  recipient?: unknown
  organizationId?: unknown
  type?: unknown
  title?: unknown
  message?: unknown
  priority?: unknown
  status?: unknown
  relatedEntity?: unknown
  readAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

export interface NotificationApiEnvelope<T> {
  success: boolean
  data?: T
  count?: number
  message?: string
}