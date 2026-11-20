import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Calendar-date building blocks for the season module.
 *
 * Badminton Vlaanderen regulations name Belgian calendar dates ("1 May",
 * "30 April"). An instant becomes a calendar date in Europe/Brussels, so the
 * answer does not depend on the server timezone. A calendar date becomes an
 * instant for the database in one of two documented ways: `storedInstant`
 * (today's convention for memberships and the Twizzit window) or
 * `brusselsDayRange` (ranking lookups). See research R3 of spec 039.
 */

/** The timezone the regulations' calendar dates are read in. */
export const BRUSSELS_TIME_ZONE = "Europe/Brussels";

/** The year a season starts in: season 2026 is 2026–27. */
export type Season = number;

/** A date on the Belgian calendar, `YYYY-MM-DD`, without time or timezone. */
export type CalendarDate = string;

/** Calendar dates, both ends included. */
export interface CalendarRange {
  from: CalendarDate;
  to: CalendarDate;
}

/** Instants for database comparisons. Each function says whether `end` is included. */
export interface InstantRange {
  start: Date;
  end: Date;
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Splits a calendar date into numbers (month 1–12).
 * Throws a RangeError for anything that is not a real `YYYY-MM-DD` date.
 */
export function parseCalendarDate(date: CalendarDate): {
  year: number;
  month: number;
  day: number;
} {
  const match = CALENDAR_DATE.exec(date);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() === year &&
      check.getUTCMonth() === month - 1 &&
      check.getUTCDate() === day
    ) {
      return { year, month, day };
    }
  }
  throw new RangeError(`Invalid calendar date: ${JSON.stringify(date)}`);
}

/** Builds a calendar date from numbers (month 1–12). */
export function calendarDate(year: number, month: number, day: number): CalendarDate {
  const date = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  parseCalendarDate(date);
  return date;
}

/** Throws a RangeError unless `season` is a whole year. */
export function assertSeason(season: Season): void {
  if (!Number.isInteger(season)) {
    throw new RangeError(`Invalid season: ${season}`);
  }
}

/**
 * The calendar date of an instant in a timezone, Europe/Brussels by default.
 * 30 April 22:30 UTC is 1 May in Brussels (summer time).
 * Throws a RangeError for an invalid date.
 */
export function toCalendarDate(at: Date, timeZone: string = BRUSSELS_TIME_ZONE): CalendarDate {
  if (Number.isNaN(at.getTime())) {
    throw new RangeError("Invalid date");
  }
  return formatInTimeZone(at, timeZone, "yyyy-MM-dd");
}

/** A calendar date as is, or the calendar date of an instant in `timeZone`. */
export function resolveCalendarDate(
  at: Date | CalendarDate,
  timeZone: string = BRUSSELS_TIME_ZONE
): CalendarDate {
  if (typeof at === "string") {
    parseCalendarDate(at);
    return at;
  }
  return toCalendarDate(at, timeZone);
}

/**
 * Midnight UTC of a calendar date.
 *
 * Storage convention, not a regulation: memberships written by the transfer and
 * loan uploads, the membership check and the Twizzit export window compare
 * against midnight UTC today (research R3). Keep using this for those values so
 * stored rows keep matching.
 */
export function storedInstant(date: CalendarDate): Date {
  const { year, month, day } = parseCalendarDate(date);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * The instants that cover a calendar range in Brussels: from the start of the
 * first day up to (not including) the start of the day after the last day.
 *
 * Used by ranking lookups. It matches rows stored at midnight UTC and rows
 * stored at midnight Brussels of the same calendar date (research R3).
 */
export function brusselsDayRange(range: CalendarRange): { start: Date; endExclusive: Date } {
  parseCalendarDate(range.from);
  const to = parseCalendarDate(range.to);
  if (range.from > range.to) {
    throw new RangeError(`Calendar range starts after it ends: ${range.from} > ${range.to}`);
  }

  const dayAfter = new Date(Date.UTC(to.year, to.month - 1, to.day + 1));
  const dayAfterDate = calendarDate(
    dayAfter.getUTCFullYear(),
    dayAfter.getUTCMonth() + 1,
    dayAfter.getUTCDate()
  );

  return {
    start: fromZonedTime(`${range.from}T00:00:00`, BRUSSELS_TIME_ZONE),
    endExclusive: fromZonedTime(`${dayAfterDate}T00:00:00`, BRUSSELS_TIME_ZONE),
  };
}
