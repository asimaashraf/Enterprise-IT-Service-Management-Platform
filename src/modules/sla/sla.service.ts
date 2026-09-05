import {
  SLAPriority,
  SLABusinessHours,
} from "./sla.model";

import { slaRepository } from "./sla.repository";
import { incidentRepository } from "../incident/incident.repository";
import { authRepository } from "../auth/auth.repository";
import { supportTeamRepository } from "../support-team/supportTeam.repository";
import * as escalationRepository from "../incident-escalation/incidentEscalation.repository";
import { notificationQueue } from "../../jobs/queues/notification.queue";
import {
  addBusinessMinutes as addConfiguredBusinessMinutes,
  BusinessHoursConfig,
  getBusinessHoursConfig,
  validateBusinessHoursConfig,
} from "./sla.business-hours";

interface SLAOptions {
  businessHours?: BusinessHoursConfig;
}

// ==========================================
// SLA RULES
// ==========================================

const SLA_RULES: Record<
  SLAPriority,
  {
    responseTimeMinutes: number;
    resolutionTimeMinutes: number;
  }
> = {
  Critical: {
    responseTimeMinutes: 15,
    resolutionTimeMinutes: 120,
  },

  High: {
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 240,
  },

  Medium: {
    responseTimeMinutes: 120,
    resolutionTimeMinutes: 480,
  },

  Low: {
    responseTimeMinutes: 240,
    resolutionTimeMinutes: 1440,
  },
};

// ==========================================
// DEFAULT BUSINESS HOURS
// ==========================================

const DEFAULT_BUSINESS_HOURS: SLABusinessHours = {
  timezone: "Asia/Karachi",

  startHour: 9,
  startMinute: 0,

  endHour: 17,
  endMinute: 0,

  workingDays: [1, 2, 3, 4, 5],
};

// ==========================================
// GET BUSINESS DAY
// ==========================================

const isBusinessDay = (
  date: Date,
  businessHours: SLABusinessHours
): boolean => {
  const day = date.getDay();

  return businessHours.workingDays.includes(day);
};

// ==========================================
// GET START OF BUSINESS DAY
// ==========================================

const getBusinessStart = (
  date: Date,
  businessHours: SLABusinessHours
): Date => {
  const result = new Date(date);

  result.setHours(
    businessHours.startHour,
    businessHours.startMinute,
    0,
    0
  );

  return result;
};

// ==========================================
// GET END OF BUSINESS DAY
// ==========================================

const getBusinessEnd = (
  date: Date,
  businessHours: SLABusinessHours
): Date => {
  const result = new Date(date);

  result.setHours(
    businessHours.endHour,
    businessHours.endMinute,
    0,
    0
  );

  return result;
};

// ==========================================
// MOVE TO NEXT BUSINESS DAY
// ==========================================

const moveToNextBusinessDay = (
  date: Date,
  businessHours: SLABusinessHours
): Date => {
  const result = new Date(date);

  result.setDate(result.getDate() + 1);

  result.setHours(
    businessHours.startHour,
    businessHours.startMinute,
    0,
    0
  );

  while (
    !isBusinessDay(
      result,
      businessHours
    )
  ) {
    result.setDate(
      result.getDate() + 1
    );
  }

  return result;
};

// ==========================================
// NORMALIZE TO BUSINESS TIME
// ==========================================

const normalizeToBusinessTime = (
  date: Date,
  businessHours: SLABusinessHours
): Date => {
  let result = new Date(date);

  while (
    !isBusinessDay(
      result,
      businessHours
    )
  ) {
    result = moveToNextBusinessDay(
      result,
      businessHours
    );
  }

  const start =
    getBusinessStart(
      result,
      businessHours
    );

  const end =
    getBusinessEnd(
      result,
      businessHours
    );

  if (result < start) {
    return start;
  }

  if (result >= end) {
    return moveToNextBusinessDay(
      result,
      businessHours
    );
  }

  return result;
};

// ==========================================
// ADD BUSINESS MINUTES
// ==========================================

const addBusinessMinutes = (
  startDate: Date,
  minutes: number,
  businessHours: SLABusinessHours
): Date => {
  let current =
    normalizeToBusinessTime(
      startDate,
      businessHours
    );

  let remainingMinutes = minutes;

  while (remainingMinutes > 0) {
    const businessEnd =
      getBusinessEnd(
        current,
        businessHours
      );

    const availableMilliseconds =
      businessEnd.getTime() -
      current.getTime();

    const availableMinutes =
      availableMilliseconds /
      (1000 * 60);

    if (
      remainingMinutes <=
      availableMinutes
    ) {
      current = new Date(
        current.getTime() +
          remainingMinutes *
            60 *
            1000
      );

      remainingMinutes = 0;

      break;
    }

    remainingMinutes -=
      availableMinutes;

    current =
      moveToNextBusinessDay(
        current,
        businessHours
      );
  }

  return current;
};

// ==========================================
// CREATE SLA FOR INCIDENT
// ==========================================

export const createSLAForIncident =
  async (
    incidentId: string,
    organizationId: string,
    options?: SLAOptions
  ) => {
    // ========================================
    // FIND INCIDENT THROUGH REPOSITORY
    // ========================================

    const incident =
      await incidentRepository.findByIdAndOrganization(
        incidentId,
        organizationId
      );

    if (!incident) {
      throw new Error(
        "Incident not found"
      );
    }

    // ========================================
    // CHECK EXISTING SLA
    // ========================================

    const existingSLA =
      await slaRepository.findByIncidentAndOrganization(
        incidentId,
        organizationId
      );

    if (existingSLA) {
      throw new Error(
        "An SLA already exists for this incident"
      );
    }

    // ========================================
    // GET PRIORITY
    // ========================================

    const priority =
      incident.priority as SLAPriority;

    const rule =
      SLA_RULES[priority];

    if (!rule) {
      throw new Error(
        "No SLA rule configured for this priority"
      );
    }

    // ========================================
    // BUSINESS HOURS
    // ========================================

    const configuredHours =
      options?.businessHours || getBusinessHoursConfig();
    validateBusinessHoursConfig(configuredHours);

    const [startHour, startMinute] = configuredHours.startTime
      .split(":")
      .map(Number);
    const [endHour, endMinute] = configuredHours.endTime
      .split(":")
      .map(Number);
    const businessHours: SLABusinessHours = {
      timezone: configuredHours.timezone,
      startHour,
      startMinute,
      endHour,
      endMinute,
      workingDays: configuredHours.workingDays,
    };

    // ========================================
    // SLA START TIME
    // ========================================

    const now = new Date();

    // ========================================
    // CALCULATE DEADLINES
    // ========================================

    const responseDueAt =
      addConfiguredBusinessMinutes(
        now,
        rule.responseTimeMinutes,
        configuredHours
      );

    const resolutionDueAt =
      addConfiguredBusinessMinutes(
        now,
        rule.resolutionTimeMinutes,
        configuredHours
      );

    // ========================================
    // CREATE SLA THROUGH REPOSITORY
    // ========================================

    return slaRepository.create({
      incidentId: incident._id,

      organizationId:
        incident.organizationId,

      priority,

      responseTimeMinutes:
        rule.responseTimeMinutes,

      resolutionTimeMinutes:
        rule.resolutionTimeMinutes,

      responseDueAt,

      resolutionDueAt,

      status: "Active",

      responseBreached: false,

      resolutionBreached: false,

      businessHours,
    });
  };

// ==========================================
// GET SLA BY INCIDENT
// ==========================================

export const getSLAByIncident =
  async (
    incidentId: string,
    organizationId: string
  ) => {
    return slaRepository.findByIncidentWithIncident(
      incidentId,
      organizationId
    );
  };

// ==========================================
// GET ALL SLAS
// ==========================================

export const getSLAsByOrganization =
  async (
    organizationId: string
  ) => {
    return slaRepository.findAllByOrganization(
      organizationId
    );
  };

// ==========================================
// CHECK SLA BREACH
// ==========================================

export const checkSLABreach =
  async (
    slaId: string,
    organizationId: string
  ) => {
    // ========================================
    // FIND SLA THROUGH REPOSITORY
    // ========================================

    const sla =
      await slaRepository.findByIdAndOrganization(
        slaId,
        organizationId
      );

    if (!sla) {
      throw new Error(
        "SLA not found"
      );
    }

    // ========================================
    // FIND INCIDENT THROUGH REPOSITORY
    // ========================================

    const incident =
      await incidentRepository.findByIdAndOrganization(
        sla.incidentId.toString(),
        organizationId
      );

    if (!incident) {
      throw new Error(
        "Incident not found"
      );
    }

    const now = new Date();

    let responseBreached =
      sla.responseBreached;

    let resolutionBreached =
      sla.resolutionBreached;

    // ========================================
    // RESPONSE BREACH
    // ========================================

    if (
      !sla.respondedAt &&
      now > sla.responseDueAt
    ) {
      responseBreached = true;
    }

    // ========================================
    // RESOLUTION BREACH
    // ========================================

    if (
      !sla.resolvedAt &&
      now > sla.resolutionDueAt &&
      incident.status !== "Resolved" &&
      incident.status !== "Closed"
    ) {
      resolutionBreached = true;
    }

    // ========================================
    // DETERMINE STATUS
    // ========================================

    let status =
      sla.status;

    if (resolutionBreached) {
      status =
        "Resolution Breached";
    } else if (responseBreached) {
      status =
        "Response Breached";
    } else if (
      incident.status === "Resolved" ||
      incident.status === "Closed"
    ) {
      status =
        "Completed";
    } else {
      status = "Active";
    }

    // ========================================
    // UPDATE SLA THROUGH REPOSITORY
    // ========================================

    return slaRepository.updateByIdAndOrganization(
      slaId,
      organizationId,
      {
        responseBreached,
        resolutionBreached,
        status,
      }
    );
  };

// ==========================================
// RECORD RESPONSE
// ==========================================

export const recordSLAResponse =
  async (
    slaId: string,
    organizationId: string
  ) => {
    const sla =
      await slaRepository.findByIdAndOrganization(
        slaId,
        organizationId
      );

    if (!sla) {
      throw new Error(
        "SLA not found"
      );
    }

    // ========================================
    // IDEMPOTENCY
    // ========================================

    if (sla.respondedAt) {
      return sla;
    }

    const respondedAt =
      new Date();

    // ========================================
    // DETERMINE BREACH
    // ========================================

    const responseBreached =
      respondedAt >
      sla.responseDueAt;

    let status =
      sla.status;

    if (responseBreached) {
      status =
        "Response Breached";
    }

    // ========================================
    // UPDATE SLA THROUGH REPOSITORY
    // ========================================

    return slaRepository.updateByIdAndOrganization(
      slaId,
      organizationId,
      {
        respondedAt,
        responseBreached,
        status,
      }
    );
  };

// ==========================================
// RECORD RESOLUTION
// ==========================================

export const recordSLAResolution =
  async (
    slaId: string,
    organizationId: string
  ) => {
    const sla =
      await slaRepository.findByIdAndOrganization(
        slaId,
        organizationId
      );

    if (!sla) {
      throw new Error(
        "SLA not found"
      );
    }

    // ========================================
    // IDEMPOTENCY
    // ========================================

    if (sla.resolvedAt) {
      return sla;
    }

    const resolvedAt =
      new Date();

    // ========================================
    // DETERMINE BREACH
    // ========================================

    const resolutionBreached =
      resolvedAt >
      sla.resolutionDueAt;

    let status:
      | "Completed"
      | "Resolution Breached" =
      "Completed";

    if (resolutionBreached) {
      status =
        "Resolution Breached";
    }

    // ========================================
    // UPDATE SLA THROUGH REPOSITORY
    // ========================================

    return slaRepository.updateByIdAndOrganization(
      slaId,
      organizationId,
      {
        resolvedAt,
        resolutionBreached,
        status,
      }
    );
  };

const getId = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }

  return String(value);
};

const queueSLANotification = async (
  userId: string,
  organizationId: string,
  title: string,
  message: string,
  entityId: string,
  priority: SLAPriority
): Promise<void> => {
  await notificationQueue.add(
    "sla-notification",
    {
      userId,
      organizationId,
      title,
      message,
      type: "SLA Breached",
      entityType: "SLA",
      entityId,
      priority,
    },
    {
      jobId: `${entityId}:${userId}:${title}`,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};

const getEscalationRecipients = async (
  policy: any,
  organizationId: string
): Promise<string[]> => {
  if (policy.targetType === "User") {
    const userId = getId(policy.targetUser);
    if (!userId) {
      return [];
    }

    const user = await authRepository.findOne({
      _id: userId,
      organizationId,
      isActive: true,
    });

    return user ? [user._id.toString()] : [];
  }

  const teamId = getId(policy.targetTeam);
  if (!teamId) {
    return [];
  }

  const team =
    await supportTeamRepository.findByIdAndOrganization(
      teamId,
      organizationId
    );

  if (!team) {
    return [];
  }

  const recipients: string[] = [];
  for (const memberId of team.members) {
    const member = await authRepository.findOne({
      _id: memberId,
      organizationId,
      isActive: true,
    });

    if (member) {
      recipients.push(member._id.toString());
    }
  }

  return recipients;
};

export const scanSLABreaches = async (): Promise<{
  checked: number;
  breached: number;
  escalated: number;
  notificationsQueued: number;
}> => {
  const slas = await slaRepository.findActiveWithIncidents();
  let breached = 0;
  let escalated = 0;
  let notificationsQueued = 0;

  for (const sla of slas) {
    const incident = sla.incidentId as any;
    if (
      !incident ||
      incident.status === "Resolved" ||
      incident.status === "Closed"
    ) {
      continue;
    }

    const updatedSLA = await checkSLABreach(
      sla._id.toString(),
      sla.organizationId.toString()
    );

    if (!updatedSLA) {
      continue;
    }

    const responseBreach = updatedSLA.responseBreached;
    const resolutionBreach = updatedSLA.resolutionBreached;
    if (!responseBreach && !resolutionBreach) {
      continue;
    }

    breached += 1;
    const recipientId =
      getId(incident.assignedTo) || getId(incident.reportedBy);
    const organizationId = sla.organizationId.toString();
    const priority = sla.priority;

    if (recipientId) {
      if (
        responseBreach &&
        !sla.responseBreachNotifiedAt &&
        (await slaRepository.claimBreachNotification(
          sla._id.toString(),
          "responseBreachNotifiedAt"
        ))
      ) {
        await queueSLANotification(
          recipientId,
          organizationId,
          "SLA Response Breached",
          `Response SLA breached for incident ${incident.incidentId}`,
          sla._id.toString(),
          priority
        );
        notificationsQueued += 1;
      }

      if (
        resolutionBreach &&
        !sla.resolutionBreachNotifiedAt &&
        (await slaRepository.claimBreachNotification(
          sla._id.toString(),
          "resolutionBreachNotifiedAt"
        ))
      ) {
        await queueSLANotification(
          recipientId,
          organizationId,
          "SLA Resolution Breached",
          `Resolution SLA breached for incident ${incident.incidentId}`,
          sla._id.toString(),
          priority
        );
        notificationsQueued += 1;
      }
    }

    const elapsedMinutes =
      Math.max(
        0,
        (Date.now() - new Date(incident.createdAt).getTime()) /
          (1000 * 60)
      );
    const policies = await escalationRepository.findApplicableForThreshold(
      organizationId,
      priority,
      elapsedMinutes
    );

    for (const policy of policies) {
      if (
        !(await slaRepository.claimEscalationPolicy(
          sla._id.toString(),
          policy._id.toString()
        ))
      ) {
        continue;
      }

      escalated += 1;
      const recipients = await getEscalationRecipients(
        policy,
        organizationId
      );

      for (const recipient of recipients) {
        await queueSLANotification(
          recipient,
          organizationId,
          "Incident Escalated",
          `Incident ${incident.incidentId} escalated by policy ${policy.name}`,
          sla._id.toString(),
          priority
        );
        notificationsQueued += 1;
      }
    }
  }

  return {
    checked: slas.length,
    breached,
    escalated,
    notificationsQueued,
  };
};