import moment from "moment";
import {
  assertSeason,
  BRUSSELS_TIME_ZONE,
  CalendarDate,
  CalendarRange,
  calendarDate,
  Season,
  toCalendarDate,
} from "./calendar";

/**
 * Ranking reference dates, one named function per concept (spec 039, US3).
 * They return calendar dates; `findLatestRankingPlaces` in
 * @badman/backend-database turns them into a query.
 */

/**
 * The reference date of the enrollment ranking: the newest place up to and
 * including 10 June of `season`.
 *
 * Current rule, kept on purpose. C320 art. 51§1 says the May ranking; whether
 * Badman should follow that is an open question for Badminton Vlaanderen.
 */
export function enrollmentRankingDate(season: Season): CalendarDate {
  assertSeason(season);
  return calendarDate(season, 6, 10);
}

/**
 * The ranking on the day of the encounter: the encounter's calendar date in
 * Brussels.
 *
 * C320 art. 51§2 and 55§1 (line-up order).
 */
export function encounterRankingDate(encounterDate: Date): CalendarDate {
  return toCalendarDate(encounterDate, BRUSSELS_TIME_ZONE);
}

/** The event fields the line-up window is configured with. */
export interface LineUpRankingSetting {
  season: Season;
  usedRankingUnit?: "months" | "weeks" | "days";
  usedRankingAmount?: number;
}

/**
 * The calendar month whose newest update publication the line-up check uses,
 * from the event's `usedRankingUnit` / `usedRankingAmount` in the season year.
 * `months` / 4 is May (moment counts months from 0).
 *
 * Current behaviour, no regulation. `months` is computed explicitly and does not
 * depend on today's date. `weeks` and `days` keep the original moment
 * computation, which does depend on today's date (research R7; BAD-380 can drop
 * it if production only uses `months`). Throws when the setting is missing.
 */
export function lineUpRankingWindow(event: LineUpRankingSetting): CalendarRange {
  const { season, usedRankingUnit, usedRankingAmount } = event;
  if (!usedRankingUnit || !usedRankingAmount) {
    throw new Error("EventCompetition usedRankingUnit is not set");
  }
  assertSeason(season);

  if (usedRankingUnit === "months") {
    // Date.UTC rolls months past December into the next year, as moment did.
    const first = new Date(Date.UTC(season, usedRankingAmount, 1));
    const last = new Date(Date.UTC(season, usedRankingAmount + 1, 0));
    return {
      from: calendarDate(first.getUTCFullYear(), first.getUTCMonth() + 1, 1),
      to: calendarDate(last.getUTCFullYear(), last.getUTCMonth() + 1, last.getUTCDate()),
    };
  }

  // Original computation, kept verbatim for units other than months.
  const usedRankingDate = moment();
  usedRankingDate.set("year", season);
  usedRankingDate.set(usedRankingUnit, usedRankingAmount);
  return {
    from: moment(usedRankingDate).startOf("month").format("YYYY-MM-DD"),
    to: moment(usedRankingDate).endOf("month").format("YYYY-MM-DD"),
  };
}
