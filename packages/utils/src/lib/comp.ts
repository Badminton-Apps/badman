import moment from "moment";
import {
  CalendarDate,
  competitionSeasonWindow,
  enrollmentSeason,
  membershipPeriod,
  nextSeason,
} from "./season";

/*
 * Old season helpers. They delegate to the season module (./season) but keep
 * reading the date the way they always did: with moment, in the process-local
 * timezone. That keeps their results exactly as before (spec 039, FR-004).
 * BAD-391 moves every caller to the module and removes these helpers.
 */

/** The calendar date moment sees for the input, today's date for missing or invalid input. */
const localCalendarDate = (inputDate?: Date | moment.Moment) => {
  let date = moment(inputDate);
  if (!date.isValid()) {
    date = moment();
  }
  return date.format("YYYY-MM-DD") as CalendarDate;
};

/**
 * @deprecated Use `competitionSeasonWindow(season ?? enrollmentSeason())` from `@badman/utils`.
 */
export const getSeasonPeriod = (season?: number) => {
  if (!season) {
    season = getSeason();
  }
  const { from, to } = competitionSeasonWindow(season);
  return [from, to] as const;
};

/**
 * @deprecated Use `enrollmentSeason` from `@badman/utils` (reads the date in Brussels time).
 */
export const getSeason = (inputDate?: Date | moment.Moment) => {
  return enrollmentSeason(localCalendarDate(inputDate));
};

/**
 * @deprecated Use `nextSeason` from `@badman/utils` (reads the date in Brussels time).
 */
export const getNextSeason = (inputDate?: Date | moment.Moment) => {
  return nextSeason(localCalendarDate(inputDate));
};

/**
 * @deprecated Use `membershipCheckInstant` or `membershipWindow` from `@badman/utils`.
 */
export const startOfSeason = (season: number) => {
  return moment(membershipPeriod(season).from, "YYYY-MM-DD");
};

/**
 * @deprecated Use `membershipWindow` from `@badman/utils`.
 */
export const endOfSeason = (season: number) => {
  return moment(membershipPeriod(season).to, "YYYY-MM-DD").endOf("day");
};
