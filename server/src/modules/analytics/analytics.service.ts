import mongoose from "mongoose";

import { authRepository } from "../auth/auth.repository";
import { analyticsRepository } from "./analytics.repository";
import { AnalyticsDateRange, trendRange, DAY } from "./analytics.validation";
import type {
  TechnicianPerformance,
  IncidentTrendsAnalytics,
  SLAComplianceAnalytics,
  ResolutionTimeAnalytics,
  AssetHealthAnalytics,
  ChangeSuccessRateAnalytics,
} from "./analytics.types";
export type {
  TechnicianPerformance,
  IncidentTrendsAnalytics,
  SLAComplianceAnalytics,
  ResolutionTimeAnalytics,
  AssetHealthAnalytics,
  ChangeSuccessRateAnalytics,
} from "./analytics.types";

// ==========================================
// TYPES
// ==========================================

// ==========================================
// VALIDATE ORGANIZATION ID
// ==========================================

const validateOrganizationId = (organizationId: string) => {
  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization ID");
  }
};

// ==========================================
// ROUND PERCENTAGE
// ==========================================

const percentage = (numerator: number, denominator: number): number => {
  if (denominator === 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
};

const getStatusCounts = <T extends { status?: string; count?: number }>(
  items: T[],
) => {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const status = item.status || "Unknown";
    counts[status] = (counts[status] || 0) + (item.count ?? 1);
  }

  return counts;
};

const getPriorityCounts = <T extends { priority?: string; count?: number }>(
  items: T[],
) => {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const priority = item.priority || "Unknown";
    counts[priority] = (counts[priority] || 0) + (item.count ?? 1);
  }

  return counts;
};

const getSeverityCounts = <T extends { severity?: string; count?: number }>(
  items: T[],
) => {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const severity = item.severity || "Unknown";
    counts[severity] = (counts[severity] || 0) + (item.count ?? 1);
  }

  return counts;
};

const getTrendSeries = (
  items: Array<{ createdAt?: Date; count: number }>,
  range: Required<AnalyticsDateRange>,
) => {
  const orderedDates: Record<string, number> = {};

  for (
    let time = range.start.getTime();
    time < range.end.getTime();
    time += DAY
  ) {
    orderedDates[new Date(time).toISOString().slice(0, 10)] = 0;
  }

  for (const item of items) {
    if (!item.createdAt) {
      continue;
    }

    const key = new Date(item.createdAt).toISOString().slice(0, 10);

    if (orderedDates[key] !== undefined) {
      orderedDates[key] += item.count;
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
  organizationId: string,
  range: AnalyticsDateRange = {},
): Promise<IncidentTrendsAnalytics> => {
  validateOrganizationId(organizationId);

  range = trendRange(range);
  const incidents = await analyticsRepository.incidentTrends(
    organizationId,
    range,
  );

  const byStatus = getStatusCounts(incidents);
  const byPriority = getPriorityCounts(incidents);
  const bySeverity = getSeverityCounts(incidents);

  return {
    totalIncidents: incidents.reduce((sum, row) => sum + row.count, 0),
    open: byStatus.Open || 0,
    inProgress: byStatus["In Progress"] || 0,
    pending: byStatus.Pending || 0,
    resolved: byStatus.Resolved || 0,
    closed: byStatus.Closed || 0,
    byStatus,
    byPriority,
    bySeverity,
    trend: getTrendSeries(incidents, range as Required<AnalyticsDateRange>),
  };
};

// ==========================================
// SLA COMPLIANCE
// ==========================================

export const getSLACompliance = async (
  organizationId: string,
  range: AnalyticsDateRange = {},
): Promise<SLAComplianceAnalytics> => {
  validateOrganizationId(organizationId);

  const slas = await analyticsRepository.slas(organizationId, range);

  const byPriority = getPriorityCounts(slas);
  const byStatus = getStatusCounts(slas);

  const totalSLAs = slas.reduce((sum, row) => sum + row.count, 0);
  const active = slas
    .filter((sla) => sla.status === "Active")
    .reduce((sum, row) => sum + row.count, 0);
  const completed = slas
    .filter((sla) => sla.status === "Completed")
    .reduce((sum, row) => sum + row.count, 0);
  const responseBreached = slas
    .filter((sla) => sla.responseBreached)
    .reduce((sum, row) => sum + row.count, 0);
  const resolutionBreached = slas
    .filter((sla) => sla.resolutionBreached)
    .reduce((sum, row) => sum + row.count, 0);
  const totalBreached = slas
    .filter((sla) => sla.responseBreached || sla.resolutionBreached)
    .reduce((sum, row) => sum + row.count, 0);

  const compliant = slas
    .filter(
      (sla) =>
        !sla.responseBreached &&
        !sla.resolutionBreached &&
        (sla.status === "Active" || sla.status === "Completed"),
    )
    .reduce((sum, row) => sum + row.count, 0);

  return {
    totalSLAs,
    active,
    completed,
    responseBreached,
    resolutionBreached,
    totalBreached,
    compliant,
    complianceRate: percentage(compliant, totalSLAs),
    byPriority,
    byStatus,
  };
};

// ==========================================
// RESOLUTION TIME
// ==========================================

export const getResolutionTime = async (
  organizationId: string,
  range: AnalyticsDateRange = {},
): Promise<ResolutionTimeAnalytics> => {
  validateOrganizationId(organizationId);

  const incidents = await analyticsRepository.resolvedIncidents(
    organizationId,
    range,
  );

  const resolvedIncidents = incidents.filter(
    (incident) =>
      incident.status === "Resolved" || incident.status === "Closed",
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
            durations.reduce((sum, value) => sum + value, 0) / durations.length
          ).toFixed(2),
        );

  const medianResolutionHours =
    durations.length === 0
      ? null
      : Number(
          (
            (durations[Math.floor((durations.length - 1) / 2)] +
              durations[Math.floor(durations.length / 2)]) /
            2
          ).toFixed(2),
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
  organizationId: string,
  range: AnalyticsDateRange = {},
): Promise<TechnicianPerformance[]> => {
  validateOrganizationId(organizationId);

  // Legacy endpoint name; operational users are active same-tenant ADMINs.
  const technicians =
    await authRepository.findActiveAdminsByOrganization(organizationId);
  const assignedIncidents = await analyticsRepository.incidents(
    organizationId,
    range,
    technicians.map((user) => user._id.toString()),
  );
  const grouped = new Map<string, typeof assignedIncidents>();
  for (const incident of assignedIncidents) {
    const id = incident.assignedTo!.toString();
    const group = grouped.get(id) ?? [];
    group.push(incident);
    grouped.set(id, group);
  }
  const results: TechnicianPerformance[] = [];
  for (const technician of technicians) {
    const incidents = grouped.get(technician._id.toString()) ?? [];

    const totalAssigned = incidents.length;

    const openIncidents = incidents.filter(
      (incident) => incident.status === "Open",
    ).length;

    const inProgressIncidents = incidents.filter(
      (incident) => incident.status === "In Progress",
    ).length;

    const resolvedIncidents = incidents.filter(
      (incident) => incident.status === "Resolved",
    ).length;

    const closedIncidents = incidents.filter(
      (incident) => incident.status === "Closed",
    ).length;

    const completedIncidents = incidents.filter(
      (incident) =>
        incident.status === "Resolved" || incident.status === "Closed",
    );

    const totalResolvedOrClosed = completedIncidents.length;

    const resolutionRate = percentage(totalResolvedOrClosed, totalAssigned);

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
      .filter((value): value is number => value !== null);

    const averageResolutionTimeHours =
      resolutionTimes.length === 0
        ? null
        : Number(
            (
              resolutionTimes.reduce((sum, value) => sum + value, 0) /
              resolutionTimes.length
            ).toFixed(2),
          );

    results.push({
      technicianId: technician._id.toString(),

      technicianName: technician.name,

      email: technician.email,

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
      b.resolutionRate - a.resolutionRate ||
      b.totalResolvedOrClosed - a.totalResolvedOrClosed,
  );
};

// ==========================================
// ASSET HEALTH
// ==========================================

export const getAssetHealth = async (
  organizationId: string,
  range: AnalyticsDateRange = {},
): Promise<AssetHealthAnalytics> => {
  validateOrganizationId(organizationId);

  const assets = await analyticsRepository.assets(organizationId);
  const now = Date.now();
  const historyRange = Object.keys(range).length
    ? range
    : {
        start: new Date(now - 90 * DAY),
        end: new Date(now + 1),
      };
  const [maintenanceRecords, lifecycleEvents] = await Promise.all([
    analyticsRepository.maintenance(
      organizationId,
      assets.map((asset) => asset._id.toString()),
      historyRange,
      now,
    ),
    Object.keys(range).length
      ? analyticsRepository.lifecycle(
          organizationId,
          assets
            .filter((asset) => asset.status === "Retired")
            .map((asset) => asset._id.toString()),
          range,
          now,
        )
      : Promise.resolve([]),
  ]);

  const totalAssets = assets.length;

  const available = assets.filter(
    (asset) => asset.status === "Available",
  ).length;

  const assigned = assets.filter((asset) => asset.status === "Assigned").length;

  const maintenance = assets.filter(
    (asset) => asset.status === "Maintenance",
  ).length;

  const retired = assets.filter((asset) => asset.status === "Retired").length;

  const activeAssets = available + assigned;
  const healthyAssets = activeAssets;

  const warrantyAlerts = assets.filter((asset) => {
    if (!asset.warrantyEndDate) {
      return false;
    }

    return (
      new Date(asset.warrantyEndDate).getTime() <=
      now + 30 * 24 * 60 * 60 * 1000
    );
  }).length;

  const maintenanceAlertSet = new Set<string>();

  for (const record of maintenanceRecords) {
    maintenanceAlertSet.add(record.assetId.toString());
  }
  // Current maintenance always remains an alert, independent of history filters.
  for (const asset of assets) {
    if (asset.status === "Maintenance")
      maintenanceAlertSet.add(asset._id.toString());
  }
  const maintenanceAlerts = maintenanceAlertSet.size;
  // Filtered lifecycle alerts are currently retired assets with a retirement
  // transition in the period. Unfiltered alerts count all currently retired assets.
  const lifecycleAlerts = Object.keys(range).length
    ? new Set(lifecycleEvents.map((event) => event.assetId.toString())).size
    : retired;

  const healthRate = percentage(healthyAssets, totalAssets);

  const maintenanceRate = percentage(maintenance, totalAssets);

  const retiredRate = percentage(retired, totalAssets);

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
  organizationId: string,
  range: AnalyticsDateRange = {},
): Promise<ChangeSuccessRateAnalytics> => {
  validateOrganizationId(organizationId);

  const changes = await analyticsRepository.changes(organizationId, range);

  const totalChanges = changes.reduce((sum, row) => sum + row.count, 0);

  const completed = changes
    .filter((change) => change.status === "Completed")
    .reduce((sum, row) => sum + row.count, 0);

  const failed = changes
    .filter((change) => change.status === "Failed")
    .reduce((sum, row) => sum + row.count, 0);

  const cancelled = changes
    .filter((change) => change.status === "Cancelled")
    .reduce((sum, row) => sum + row.count, 0);

  /*
   * Completed changes are successful.
   */

  const successfulChanges = completed;

  /*
   * Failed and cancelled changes are
   * unsuccessful.
   */

  const unsuccessfulChanges = failed + cancelled;

  /*
   * Only completed, failed, and cancelled
   * changes have a final outcome.
   */

  const evaluatedChanges = successfulChanges + unsuccessfulChanges;

  /*
   * Draft, Pending Approval, Approved,
   * Scheduled, In Progress, and Rejected
   * changes are not yet counted as a
   * success/failure outcome.
   */

  const unevaluatedChanges = totalChanges - evaluatedChanges;

  const successRate = percentage(successfulChanges, evaluatedChanges);

  const failureRate = percentage(unsuccessfulChanges, evaluatedChanges);

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
