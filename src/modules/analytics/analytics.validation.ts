export const DAY = 86_400_000;
export interface AnalyticsDateRange {
  start?: Date;
  end?: Date;
}

// A bounded daily response prevents an arbitrary number of trend buckets.
export const MAX_ANALYTICS_DAYS = 366;
export function parseAnalyticsDateRange(
  query: Record<string, unknown>,
): AnalyticsDateRange {
  const parse = (key: string): Date | undefined => {
    const value = query[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`${key} must be a single YYYY-MM-DD date`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new Error(`${key} is not a valid calendar date`);
    }
    return date;
  };
  // Express's simple parser retains bracket syntax as literal keys.
  if (Object.keys(query).some((key) => /^(startDate|endDate)[\[.]/.test(key))) {
    throw new Error("Date parameters must be single YYYY-MM-DD strings");
  }
  const start = parse("startDate");
  const last = parse("endDate");
  if (!start && !last) return {};
  if (!start || !last) throw new Error("Provide both startDate and endDate");
  const end = new Date(last.getTime() + DAY);
  if (start > last) throw new Error("startDate must be on or before endDate");
  if ((end.getTime() - start.getTime()) / DAY > MAX_ANALYTICS_DAYS) {
    throw new Error(
      `Date ranges must not exceed ${MAX_ANALYTICS_DAYS} inclusive days`,
    );
  }
  return { start, end };
}

export function trendRange(
  range: AnalyticsDateRange,
): Required<AnalyticsDateRange> {
  const today = new Date().toISOString().slice(0, 10);
  const end =
    range.end ?? new Date(new Date(`${today}T00:00:00Z`).getTime() + DAY);
  return { start: range.start ?? new Date(end.getTime() - 30 * DAY), end };
}

export function dateFilter(range: AnalyticsDateRange) {
  return {
    ...(range.start ? { $gte: range.start } : {}),
    ...(range.end ? { $lt: range.end } : {}),
  };
}
