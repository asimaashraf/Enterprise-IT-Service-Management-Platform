import mongoose from "mongoose";
import Incident from "../incident/incident.model";
import SLA from "../sla/sla.model";
import Asset from "../asset/asset.model";
import Maintenance from "../asset/assetMaintenance.model";
import Lifecycle from "../asset/assetLifecycle.model";
import Change from "../change/change.model";
import { AnalyticsDateRange, dateFilter } from "./analytics.validation";

const cohort = (field: string, range: AnalyticsDateRange) =>
  range.start || range.end ? { [field]: dateFilter(range) } : {};

// Reporting-only projections: no population, hydration, or unused sorting.
// These do not alter the operational repositories' behavior.
export const analyticsRepository = {
  incidentTrends: (organizationId: string, range: AnalyticsDateRange) =>
    Incident.aggregate<{
      status: string;
      priority: string;
      severity: string;
      createdAt: Date;
      count: number;
    }>([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          ...cohort("createdAt", range),
        },
      },
      {
        $group: {
          _id: {
            status: "$status",
            priority: "$priority",
            severity: "$severity",
            createdAt: {
              $dateTrunc: { date: "$createdAt", unit: "day", timezone: "UTC" },
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$_id", { count: "$count" }] },
        },
      },
    ]),
  incidents: (
    organizationId: string,
    range: AnalyticsDateRange,
    assignees?: string[],
  ) =>
    Incident.find({
      organizationId,
      ...cohort("createdAt", range),
      ...(assignees ? { assignedTo: { $in: assignees } } : {}),
    })
      .select(
        "status priority severity assignedTo createdAt resolvedAt closedAt",
      )
      .lean(),

  resolvedIncidents: (organizationId: string, range: AnalyticsDateRange) =>
    Incident.find({
      organizationId,
      status: { $in: ["Resolved", "Closed"] },
      ...(range.start || range.end
        ? {
            $or: [
              { resolvedAt: dateFilter(range) },
              { resolvedAt: null, closedAt: dateFilter(range) },
            ],
          }
        : {}),
    })
      .select("status priority createdAt resolvedAt closedAt")
      .lean(),

  slas: (organizationId: string, range: AnalyticsDateRange) =>
    SLA.aggregate<{
      status: string;
      priority: string;
      responseBreached: boolean;
      resolutionBreached: boolean;
      count: number;
    }>([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          ...cohort("createdAt", range),
        },
      },
      {
        $group: {
          _id: {
            status: "$status",
            priority: "$priority",
            responseBreached: "$responseBreached",
            resolutionBreached: "$resolutionBreached",
          },
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$_id", { count: "$count" }] },
        },
      },
    ]),

  assets: (organizationId: string) =>
    Asset.find({ organizationId }).select("status warrantyEndDate").lean(),

  maintenance: async (
    organizationId: string,
    assetIds: string[],
    range: AnalyticsDateRange,
    now: number,
  ) =>
    (
      await Maintenance.distinct("assetId", {
        organizationId,
        assetId: { $in: assetIds },
        status: { $ne: "Cancelled" },
        date: { ...dateFilter(range), $lte: new Date(now) },
      })
    ).map((assetId) => ({ assetId })),

  lifecycle: async (
    organizationId: string,
    assetIds: string[],
    range: AnalyticsDateRange,
    now: number,
  ) =>
    (
      await Lifecycle.distinct("assetId", {
        organizationId,
        assetId: { $in: assetIds },
        newStatus: "Retired",
        changedAt: { ...dateFilter(range), $lte: new Date(now) },
      })
    ).map((assetId) => ({ assetId })),

  changes: (organizationId: string, range: AnalyticsDateRange) =>
    Change.aggregate<{ status: string; count: number }>([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          ...(range.start || range.end
            ? {
                $or: [
                  { status: "Completed", completedAt: dateFilter(range) },
                  { status: "Failed", failedAt: dateFilter(range) },
                  { status: "Cancelled", cancelledAt: dateFilter(range) },
                ],
              }
            : {}),
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),
};
