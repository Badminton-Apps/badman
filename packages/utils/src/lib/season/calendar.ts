import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Calendar-date building blocks for the season module.
 *
 * Badminton Vlaanderen regulations name Belgian calendar dates ("1 May",
 * "30 April"). An instant becomes a calendar date in Europe/Brussels, so the
 * answer does not depend on the server timezone. A calendar date becomes an
 * instant for the database as midnight in Brussels (`storedInstant`), and a
 * range of dates as the Brussels days it covers (`brusselsDayRange`). That is
 * what production stores and compares today: the services run with
 * TZ=Europe/Brussels (research R1 and R3 of spec 039).
 */

/** The timezone the regulations' calendar dates are read in. */
export const BRUSSELS_TIME_ZONE = "Europe/Brussels";

/** The year a season starts in: season 2026 is 2026–27. */
export type Season = number;

/**
 * A date on the Belgian calendar, `YYYY-MM-DD`, without time or timezone. The
 * type rejects other formats such as "10/06/2026" or an ISO instant at compile
 * time; `parseCalendarDate` checks the value at run time.
 */
export type CalendarDate = `${number}-${number}-${number}`;

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
export function parseCalendarDate(date: string): {
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
  return date as CalendarDate;
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
  return formatInTimeZone(at, timeZone, "yyyy-MM-dd") as CalendarDate;
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
 * Midnight in Brussels of a calendar date: 1 July 2026 is 2026-06-30T22:00Z.
 *
 * Storage convention, not a regulation: production runs with
 * TZ=Europe/Brussels, so memberships written by the transfer and loan uploads,
 * the membership check and the Twizzit export window use midnight in Brussels
 * (research R3). Use this for those values so stored rows keep matching.
 */
export function storedInstant(date: CalendarDate): Date {
  parseCalendarDate(date);
  return fromZonedTime(`${date}T00:00:00`, BRUSSELS_TIME_ZONE);
}

/**
 * The instants that cover a calendar range in Brussels: from the start of the
 * first day up to (not including) the start of the day after the last day.
 *
 * Used by ranking lookups. It matches rows stored at midnight in Brussels (how
 * the ranking sync stores them) and at midnight UTC of the same calendar date.
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

  return { start: storedInstant(range.from), endExclusive: storedInstant(dayAfterDate) };
}
