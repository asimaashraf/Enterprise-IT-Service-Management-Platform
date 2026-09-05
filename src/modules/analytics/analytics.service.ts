import mongoose from "mongoose";

import { authRepository } from "../auth/auth.repository";
import { incidentRepository } from "../incident/incident.repository";
import { assetRepository } from "../asset/asset.repository";
import { changeRepository } from "../change/change.repository";
import { slaRepository } from "../sla/sla.repository";
import { assetMaintenanceRepository } from "../asset/assetMaintenance.repository";
import { assetLifecycleRepository } from "../asset/assetLifecycle.repository";

// ==========================================
// TYPES
// ==========================================

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  email: string;

  totalAssigned: number;
  openIncidents: number;
  inProgressIncidents: number;
  resolvedIncidents: number;
  closedIncidents: number;

  totalResolvedOrClosed: number;
  resolutionRate: number;

  averageResolutionTimeHours: number | null;
}

export interface IncidentTrendsAnalytics {
  totalIncidents: number;
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  bySeverity: Record<string, number>;
  trend: Array<{ date: string; count: number }>;
}

export interface SLAComplianceAnalytics {
  totalSLAs: number;
  active: number;
  completed: number;
  responseBreached: number;
  resolutionBreached: number;
  totalBreached: number;
  compliant: number;
  complianceRate: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ResolutionTimeAnalytics {
  totalResolvedIncidents: number;
  averageResolutionHours: number | null;
  medianResolutionHours: number | null;
  byPriority: Record<string, number>;
}

export interface AssetHealthAnalytics {
  totalAssets: number;

  available: number;
  assigned: number;
  maintenance: number;
  retired: number;

  activeAssets: number;
  healthyAssets: number;

  warrantyAlerts: number;
  maintenanceAlerts: number;
  lifecycleAlerts: number;

  healthRate: number;
  maintenanceRate: number;
  retiredRate: number;
}

export interface ChangeSuccessRateAnalytics {
  totalChanges: number;

  completed: number;
  failed: number;
  cancelled: number;

  successfulChanges: number;
  unsuccessfulChanges: number;
  evaluatedChanges: number;
  unevaluatedChanges: number;

  successRate: number;
  failureRate: number;
}

// ==========================================
// VALIDATE ORGANIZATION ID
// ==========================================

const validateOrganizationId = (organizationId: string) => {
  if (
    !organizationId ||
    !mongoose.Types.ObjectId.isValid(organizationId)
  ) {
    throw new Error("Invalid organization ID");
  }
};

// ==========================================
// ROUND PERCENTAGE
// ==========================================

const percentage = (
  numerator: number,
  denominator: number
): number => {
  if (denominator === 0) {
    return 0;
  }

  return Number(
    ((numerator / denominator) * 100).toFixed(2)
  );
};

const getStatusCounts = <T extends { status?: string }>(items: T[]) => {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const status = item.status || "Unknown";
    counts[status] = (counts[status] || 0) + 1;
  }

  return counts;
};

const getPriorityCounts = <T extends { priority?: string }>(items: T[]) => {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const priority = item.priority || "Unknown";
    counts[priority] = (counts[priority] || 0) + 1;
  }

  return counts;
};

const getSeverityCounts = <T extends { severity?: string }>(items: T[]) => {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const severity = item.severity || "Unknown";
    counts[severity] = (counts[severity] || 0) + 1;
  }

  return counts;
};

const getTrendSeries = (items: Array<{ createdAt?: Date }>) => {
  const orderedDates: Record<string, number> = {};

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - index);
    orderedDates[date.toISOString().slice(0, 10)] = 0;
  }

  for (const item of items) {
    if (!item.createdAt) {
      continue;
    }

    const key = new Date(item.createdAt)
      .toISOString()
      .slice(0, 10);

    if (orderedDates[key] !== undefined) {
      orderedDates[key] += 1;
    }
  }

  return Object.entries(orderedDates).map(([date, count]) => ({
    date,
    count,
  }));
};

// ==========================================
// INCIDENT TRENDS
// ==========================================

export const getIncidentTrends = async (
  organizationId: string
): Promise<IncidentTrendsAnalytics> => {
  validateOrganizationId(organizationId);

  const incidents = await incidentRepository.findAllByOrganization(
    organizationId
  );

  const byStatus = getStatusCounts(incidents);
  const byPriority = getPriorityCounts(incidents);
  const bySeverity = getSeverityCounts(incidents);

  return {
    totalIncidents: incidents.length,
    open: byStatus.Open || 0,
    inProgress: byStatus["In Progress"] || 0,
    pending: byStatus.Pending || 0,
    resolved: byStatus.Resolved || 0,
    closed: byStatus.Closed || 0,
    byStatus,
    byPriority,
    bySeverity,
    trend: getTrendSeries(incidents),
  };
};

// ==========================================
// SLA COMPLIANCE
// ==========================================

export const getSLACompliance = async (
  organizationId: string
): Promise<SLAComplianceAnalytics> => {
  validateOrganizationId(organizationId);

  const slas = await slaRepository.findByOrganization(organizationId);

  const byPriority = getPriorityCounts(slas);
  const byStatus = getStatusCounts(slas);

  const active = slas.filter((sla) => sla.status === "Active").length;
  const completed = slas.filter((sla) => sla.status === "Completed").length;
  const responseBreached = slas.filter((sla) => sla.responseBreached).length;
  const resolutionBreached = slas.filter((sla) => sla.resolutionBreached).length;
  const totalBreached = responseBreached + resolutionBreached;

  const compliant = slas.filter(
    (sla) =>
      !sla.responseBreached &&
      !sla.resolutionBreached &&
      (sla.status === "Active" || sla.status === "Completed")
  ).length;

  return {
    totalSLAs: slas.length,
    active,
    completed,
    responseBreached,
    resolutionBreached,
    totalBreached,
    compliant,
    complianceRate: percentage(compliant, slas.length),
    byPriority,
    byStatus,
  };
};

// ==========================================
// RESOLUTION TIME
// ==========================================

export const getResolutionTime = async (
  organizationId: string
): Promise<ResolutionTimeAnalytics> => {
  validateOrganizationId(organizationId);

  const incidents = await incidentRepository.findAllByOrganization(
    organizationId
  );

  const resolvedIncidents = incidents.filter(
    (incident) =>
      incident.status === "Resolved" ||
      incident.status === "Closed"
  );

  const durations = resolvedIncidents
    .map((incident) => {
      const endDate = incident.resolvedAt ?? incident.closedAt;

      if (!endDate || !incident.createdAt) {
        return null;
      }

      const start = new Date(incident.createdAt).getTime();
      const end = new Date(endDate).getTime();

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
      }

      return (end - start) / (1000 * 60 * 60);
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  const averageResolutionHours =
    durations.length === 0
      ? null
      : Number(
          (
            durations.reduce((sum, value) => sum + value, 0) /
            durations.length
          ).toFixed(2)
        );

  const medianResolutionHours =
    durations.length === 0
      ? null
      : Number(
          (
            durations[Math.floor(durations.length / 2)] ||
            durations[0]
          ).toFixed(2)
        );

  const byPriority = getPriorityCounts(resolvedIncidents);

  return {
    totalResolvedIncidents: resolvedIncidents.length,
    averageResolutionHours,
    medianResolutionHours,
    byPriority,
  };
};

// ==========================================
// TECHNICIAN PERFORMANCE
// ==========================================

export const getTechnicianPerformance = async (
  organizationId: string
): Promise<TechnicianPerformance[]> => {
  validateOrganizationId(organizationId);

  /*
   * Only active employees are technicians.
   *
   * Admins are intentionally excluded because
   * incidents are only assignable to employees.
   */

  const technicians =
    await authRepository.findActiveEmployeesByOrganization(
      organizationId
    );

  const results: TechnicianPerformance[] = [];

  /*
   * Each technician's incidents are retrieved
   * through the repository layer.
   *
   * This keeps database access out of the
   * analytics service.
   */

  for (const technician of technicians) {
    const incidents =
      await incidentRepository.findByTechnician(
        organizationId,
        technician._id.toString()
      );

    const totalAssigned = incidents.length;

    const openIncidents = incidents.filter(
      (incident) =>
        incident.status === "Open"
    ).length;

    const inProgressIncidents = incidents.filter(
      (incident) =>
        incident.status === "In Progress"
    ).length;

    const resolvedIncidents = incidents.filter(
      (incident) =>
        incident.status === "Resolved"
    ).length;

    const closedIncidents = incidents.filter(
      (incident) =>
        incident.status === "Closed"
    ).length;

    const completedIncidents = incidents.filter(
      (incident) =>
        incident.status === "Resolved" ||
        incident.status === "Closed"
    );

    const totalResolvedOrClosed =
      completedIncidents.length;

    const resolutionRate = percentage(
      totalResolvedOrClosed,
      totalAssigned
    );

    // ========================================
    // AVERAGE RESOLUTION TIME
    // ========================================

    const resolutionTimes = completedIncidents
      .map((incident) => {
        /*
         * Prefer resolvedAt.
         *
         * For incidents closed without a
         * previous resolution timestamp,
         * closedAt is used as the completion
         * timestamp.
         */

        const endDate =
          incident.resolvedAt ??
          incident.closedAt;

        if (!endDate) {
          return null;
        }

        const start = new Date(
          incident.createdAt
        ).getTime();

        const end = new Date(
          endDate
        ).getTime();

        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          end <= start
        ) {
          return null;
        }

        return (
          (end - start) /
          (1000 * 60 * 60)
        );
      })
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

    const averageResolutionTimeHours =
      resolutionTimes.length === 0
        ? null
        : Number(
            (
              resolutionTimes.reduce(
                (sum, value) =>
                  sum + value,
                0
              ) /
              resolutionTimes.length
            ).toFixed(2)
          );

    results.push({
      technicianId:
        technician._id.toString(),

      technicianName:
        technician.name,

      email:
        technician.email,

      totalAssigned,

      openIncidents,

      inProgressIncidents,

      resolvedIncidents,

      closedIncidents,

      totalResolvedOrClosed,

      resolutionRate,

      averageResolutionTimeHours,
    });
  }

  /*
   * Highest resolution rate first.
   *
   * If two technicians have the same rate,
   * the one with more resolved/closed incidents
   * comes first.
   */

  return results.sort(
    (a, b) =>
      b.resolutionRate -
        a.resolutionRate ||
      b.totalResolvedOrClosed -
        a.totalResolvedOrClosed
  );
};

// ==========================================
// ASSET HEALTH
// ==========================================

export const getAssetHealth = async (
  organizationId: string
): Promise<AssetHealthAnalytics> => {
  validateOrganizationId(organizationId);

  const assets =
    await assetRepository.findByOrganization(
      organizationId
    );

  const maintenanceRecords =
    await assetMaintenanceRepository.findByOrganization(
      organizationId
    );

  const lifecycleEvents =
    await assetLifecycleRepository.findByOrganization(
      organizationId
    );

  const totalAssets = assets.length;

  const available = assets.filter(
    (asset) =>
      asset.status === "Available"
  ).length;

  const assigned = assets.filter(
    (asset) =>
      asset.status === "Assigned"
  ).length;

  const maintenance = assets.filter(
    (asset) =>
      asset.status === "Maintenance"
  ).length;

  const retired = assets.filter(
    (asset) =>
      asset.status === "Retired"
  ).length;

  const activeAssets = available + assigned;
  const healthyAssets = activeAssets;

  const now = Date.now();
  const warrantyAlerts = assets.filter((asset) => {
    if (!asset.warrantyEndDate) {
      return false;
    }

    return new Date(asset.warrantyEndDate).getTime() <= now + 30 * 24 * 60 * 60 * 1000;
  }).length;

  const maintenanceAlertSet = new Set<string>();

  for (const record of maintenanceRecords) {
    const recordDate = new Date(record.date).getTime();
    const isRecent = now - recordDate <= 90 * 24 * 60 * 60 * 1000;

    if (isRecent) {
      maintenanceAlertSet.add(record.assetId.toString());
    }
  }

  for (const asset of assets) {
    if (asset.status === "Maintenance") {
      maintenanceAlertSet.add(asset._id.toString());
    }
  }

  const maintenanceAlerts = maintenanceAlertSet.size;

  const lifecycleAlertSet = new Set<string>();

  for (const event of lifecycleEvents) {
    if (event.newStatus === "Retired" || event.previousStatus === "Retired") {
      lifecycleAlertSet.add(event.assetId.toString());
    }
  }

  for (const asset of assets) {
    if (asset.status === "Retired") {
      lifecycleAlertSet.add(asset._id.toString());
    }
  }

  const lifecycleAlerts = lifecycleAlertSet.size;

  const healthRate = percentage(
    healthyAssets,
    totalAssets
  );

  const maintenanceRate = percentage(
    maintenance,
    totalAssets
  );

  const retiredRate = percentage(
    retired,
    totalAssets
  );

  return {
    totalAssets,

    available,

    assigned,

    maintenance,

    retired,

    activeAssets,

    healthyAssets,

    warrantyAlerts,
    maintenanceAlerts,
    lifecycleAlerts,

    healthRate,

    maintenanceRate,

    retiredRate,
  };
};

// ==========================================
// CHANGE SUCCESS RATE
// ==========================================

export const getChangeSuccessRate = async (
  organizationId: string
): Promise<ChangeSuccessRateAnalytics> => {
  validateOrganizationId(organizationId);

  const changes =
    await changeRepository.findByOrganization(
      organizationId
    );

  const totalChanges = changes.length;

  const completed = changes.filter(
    (change) =>
      change.status === "Completed"
  ).length;

  const failed = changes.filter(
    (change) =>
      change.status === "Failed"
  ).length;

  const cancelled = changes.filter(
    (change) =>
      change.status === "Cancelled"
  ).length;

  /*
   * Completed changes are successful.
   */

  const successfulChanges =
    completed;

  /*
   * Failed and cancelled changes are
   * unsuccessful.
   */

  const unsuccessfulChanges =
    failed + cancelled;

  /*
   * Only completed, failed, and cancelled
   * changes have a final outcome.
   */

  const evaluatedChanges =
    successfulChanges +
    unsuccessfulChanges;

  /*
   * Draft, Pending Approval, Approved,
   * Scheduled, In Progress, and Rejected
   * changes are not yet counted as a
   * success/failure outcome.
   */

  const unevaluatedChanges =
    totalChanges -
    evaluatedChanges;

  const successRate = percentage(
    successfulChanges,
    evaluatedChanges
  );

  const failureRate = percentage(
    unsuccessfulChanges,
    evaluatedChanges
  );

  return {
    totalChanges,

    completed,

    failed,

    cancelled,

    successfulChanges,

    unsuccessfulChanges,

    evaluatedChanges,

    unevaluatedChanges,

    successRate,

    failureRate,
  };
};