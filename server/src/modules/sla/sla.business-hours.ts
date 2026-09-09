// ==========================================
// SLA BUSINESS HOURS
// ==========================================

export interface BusinessHoursConfig {
  startTime: string;
  endTime: string;
  timezone: string;
  workingDays: number[];
}

export const validateBusinessHoursConfig = (
  config: BusinessHoursConfig
): void => {
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

  if (
    !timePattern.test(config.startTime) ||
    !timePattern.test(config.endTime)
  ) {
    throw new Error("Business hours must use HH:mm format");
  }

  if (config.startTime >= config.endTime) {
    throw new Error("Business hours end time must be after start time");
  }

  if (!config.timezone?.trim()) {
    throw new Error("Business hours timezone is required");
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: config.timezone,
    }).format();
  } catch {
    throw new Error("Invalid business hours timezone");
  }

  if (
    config.workingDays.length === 0 ||
    config.workingDays.some(
      (day) => !Number.isInteger(day) || day < 1 || day > 7
    )
  ) {
    throw new Error("Business days must be integers from 1 to 7");
  }
};

// ==========================================
// DEFAULT CONFIGURATION
// ==========================================

export const getBusinessHoursConfig =
  (): BusinessHoursConfig => {
    const config = {
      startTime:
        process.env.SLA_BUSINESS_START ||
        "09:00",

      endTime:
        process.env.SLA_BUSINESS_END ||
        "17:00",

      timezone:
        process.env.SLA_TIMEZONE ||
        "Asia/Karachi",

      workingDays:
        (
          process.env.SLA_WORKING_DAYS ||
          "1,2,3,4,5"
        )
          .split(",")
          .map(Number),
    };

    validateBusinessHoursConfig(config);
    return config;
  };

// ==========================================
// PARSE TIME
// ==========================================

const parseTime = (
  time: string
): {
  hour: number;
  minute: number;
} => {
  const [hour, minute] =
    time.split(":").map(Number);

  return {
    hour,
    minute,
  };
};

// ==========================================
// GET DATE PARTS IN TIMEZONE
// ==========================================

const getDateParts = (
  date: Date,
  timezone: string
) => {
  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }
  );

  const parts = formatter.formatToParts(date);

  const values: Record<string, number> = {};

  parts.forEach((part) => {
    if (
      [
        "year",
        "month",
        "day",
        "hour",
        "minute",
        "second",
      ].includes(part.type)
    ) {
      values[part.type] =
        Number(part.value);
    }
  });

  return values;
};

// ==========================================
// GET DAY OF WEEK IN TIMEZONE
// ==========================================

const getDayOfWeek = (
  date: Date,
  timezone: string
): number => {
  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: timezone,
      weekday: "short",
    }
  );

  const weekday =
    formatter.format(date);

  const days: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return days[weekday];
};

// ==========================================
// CREATE DATE FROM LOCAL TIMEZONE
// ==========================================

const createDateInTimezone = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date => {
  const target =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0
    );

  let date = new Date(target);

  for (let i = 0; i < 3; i++) {
    const parts = getDateParts(
      date,
      timezone
    );

    const currentAsUTC =
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        0,
        0
      );

    const desiredAsUTC =
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0
      );

    const difference =
      desiredAsUTC - currentAsUTC;

    if (difference === 0) {
      break;
    }

    date = new Date(
      date.getTime() + difference
    );
  }

  return date;
};

// ==========================================
// NEXT CALENDAR DAY
// ==========================================

const getNextDay = (
  year: number,
  month: number,
  day: number
) => {
  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day + 1
    )
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

// ==========================================
// ADD BUSINESS MINUTES
// ==========================================

export const addBusinessMinutes = (
  startDate: Date,
  minutes: number,
  config: BusinessHoursConfig
): Date => {
  validateBusinessHoursConfig(config);

  if (minutes <= 0) {
    return startDate;
  }

  const {
    hour: startHour,
    minute: startMinute,
  } = parseTime(config.startTime);

  const {
    hour: endHour,
    minute: endMinute,
  } = parseTime(config.endTime);

  let current = new Date(startDate);

  let remainingMinutes = minutes;

  while (remainingMinutes > 0) {
    const parts = getDateParts(
      current,
      config.timezone
    );

    const dayOfWeek =
      getDayOfWeek(
        current,
        config.timezone
      );

    // ========================================
    // SKIP NON-WORKING DAYS
    // ========================================

    if (
      !config.workingDays.includes(
        dayOfWeek
      )
    ) {
      const next = getNextDay(
        parts.year,
        parts.month,
        parts.day
      );

      current =
        createDateInTimezone(
          next.year,
          next.month,
          next.day,
          startHour,
          startMinute,
          config.timezone
        );

      continue;
    }

    const businessStart =
      createDateInTimezone(
        parts.year,
        parts.month,
        parts.day,
        startHour,
        startMinute,
        config.timezone
      );

    const businessEnd =
      createDateInTimezone(
        parts.year,
        parts.month,
        parts.day,
        endHour,
        endMinute,
        config.timezone
      );

    // ========================================
    // BEFORE BUSINESS HOURS
    // ========================================

    if (current < businessStart) {
      current = businessStart;
    }

    // ========================================
    // AFTER BUSINESS HOURS
    // ========================================

    if (current >= businessEnd) {
      const next = getNextDay(
        parts.year,
        parts.month,
        parts.day
      );

      current =
        createDateInTimezone(
          next.year,
          next.month,
          next.day,
          startHour,
          startMinute,
          config.timezone
        );

      continue;
    }

    // ========================================
    // AVAILABLE MINUTES TODAY
    // ========================================

    const availableMinutes =
      Math.floor(
        (businessEnd.getTime() -
          current.getTime()) /
          (1000 * 60)
      );

    // ========================================
    // FINISH TODAY
    // ========================================

    if (
      remainingMinutes <=
      availableMinutes
    ) {
      return new Date(
        current.getTime() +
          remainingMinutes *
            60 *
            1000
      );
    }

    // ========================================
    // CONTINUE NEXT BUSINESS DAY
    // ========================================

    remainingMinutes -=
      availableMinutes;

    const next = getNextDay(
      parts.year,
      parts.month,
      parts.day
    );

    current =
      createDateInTimezone(
        next.year,
        next.month,
        next.day,
        startHour,
        startMinute,
        config.timezone
      );
  }

  return current;
};