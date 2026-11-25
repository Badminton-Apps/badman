import { assertSeason, CalendarDate, CalendarRange, calendarDate, Season } from "./calendar";

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

/** The event fields the line-up window is configured with. */
export interface LineUpRankingSetting {
  season: Season;
  usedRankingUnit?: "months" | "weeks" | "days";
  usedRankingAmount?: number;
}

/**
 * The calendar month whose newest update publication the line-up check uses,
 * from the event's `usedRankingUnit` / `usedRankingAmount` in the season year.
 * `months` / 4 is May (moment counts months from 0), the setting every event in
 * production uses.
 *
 * Current behaviour, no regulation. Only `months` is supported: no event uses
 * `weeks` or `days` (research R7), whose moment semantics depended on today's
 * date. Throws when the setting is missing or uses another unit.
 */
export function lineUpRankingWindow(event: LineUpRankingSetting): CalendarRange {
  const { season, usedRankingUnit, usedRankingAmount } = event;
  if (!usedRankingUnit || !usedRankingAmount) {
    throw new Error("EventCompetition usedRankingUnit is not set");
  }
  if (usedRankingUnit !== "months") {
    throw new Error(
      `EventCompetition usedRankingUnit "${usedRankingUnit}" is not supported, use "months"`
    );
  }
  assertSeason(season);

  // Date.UTC rolls months past December into the next year, as moment did.
  const first = new Date(Date.UTC(season, usedRankingAmount, 1));
  const last = new Date(Date.UTC(season, usedRankingAmount + 1, 0));
  return {
    from: calendarDate(first.getUTCFullYear(), first.getUTCMonth() + 1, 1),
    to: calendarDate(last.getUTCFullYear(), last.getUTCMonth() + 1, last.getUTCDate()),
  };
}
