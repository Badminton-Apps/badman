import {
  assertSeason,
  BRUSSELS_TIME_ZONE,
  CalendarDate,
  CalendarRange,
  calendarDate,
  InstantRange,
  parseCalendarDate,
  resolveCalendarDate,
  Season,
  storedInstant,
} from "./calendar";

/**
 * Season concepts, one named function per concept (spec 039, US1).
 *
 * Functions that take a moment accept an instant (`Date`) or a calendar date
 * (`YYYY-MM-DD`). An instant is read on the Brussels calendar unless another
 * `timeZone` is passed, so a server in UTC gives the same answer as one in
 * Brussels. Functions that return instants for the database document which
 * storage convention they use (research R3).
 */

/** First half: calendar year = season. Second half: calendar year = season + 1. */
export type SeasonHalf = "first" | "second";

/**
 * The season "now" means for enrollment: it switches on 1 May.
 * 30 April 2027 → 2026, 1 May 2027 → 2027. Defaults to the current moment.
 *
 * Practical rule, no regulation: teams enroll in May for the season that
 * starts in September (enrollment deadline C320 art. 21§1).
 *
 * Not the season of an encounter: an encounter that moves to May still
 * belongs to the season that ended in April (Badminton Vlaanderen, BAD-397).
 * Callers that apply this to encounter dates today are pinned in tests and
 * move to an encounter rule in BAD-397.
 */
export function enrollmentSeason(
  at: Date | CalendarDate = new Date(),
  timeZone: string = BRUSSELS_TIME_ZONE
): Season {
  const { year, month } = parseCalendarDate(resolveCalendarDate(at, timeZone));
  return month >= 5 ? year : year - 1;
}

/**
 * The competition season: 1 September `season` up to and including 30 April
 * `season + 1`.
 *
 * C320 art. 1§2.
 */
export function competitionSeasonWindow(season: Season): CalendarRange {
  assertSeason(season);
  return { from: calendarDate(season, 9, 1), to: calendarDate(season + 1, 4, 30) };
}

/**
 * Whether the calendar date of `at` lies in the competition season, both ends
 * included.
 *
 * C320 art. 1§2.
 */
export function isInCompetitionSeason(
  at: Date | CalendarDate,
  season: Season,
  timeZone: string = BRUSSELS_TIME_ZONE
): boolean {
  const date = resolveCalendarDate(at, timeZone);
  const { from, to } = competitionSeasonWindow(season);
  return date >= from && date <= to;
}

/**
 * The half of the season a date falls in: calendar year = season → "first",
 * calendar year = season + 1 → "second", any other year → null.
 *
 * C320 art. 20§3 and 26§5 (first half September–December, second half
 * January–April). The split by calendar year is a practical rule: it also puts
 * May and June encounters in the second half, as Badman does today.
 */
export function seasonHalf(
  at: Date | CalendarDate,
  season: Season,
  timeZone: string = BRUSSELS_TIME_ZONE
): SeasonHalf | null {
  assertSeason(season);
  const { year } = parseCalendarDate(resolveCalendarDate(at, timeZone));
  if (year === season) {
    return "first";
  }
  if (year === season + 1) {
    return "second";
  }
  return null;
}

/**
 * The calendar dates of the season membership: 1 July `season` up to and
 * including 30 June `season + 1`.
 *
 * C925 (transfers) and C950 (loans) take effect on 1 July.
 */
export function membershipPeriod(season: Season): CalendarRange {
  assertSeason(season);
  return { from: calendarDate(season, 7, 1), to: calendarDate(season + 1, 6, 30) };
}

/**
 * The membership window as stored instants: 1 July `season` 00:00 up to and
 * including 30 June `season + 1` 23:59:59.999, Brussels time.
 *
 * C925, C950. Midnight in Brussels is how memberships are stored (research R3),
 * see `storedInstant`.
 */
export function membershipWindow(season: Season): InstantRange {
  const { from } = membershipPeriod(season);
  const nextStart = storedInstant(membershipPeriod(season + 1).from);
  return { start: storedInstant(from), end: new Date(nextStart.getTime() - 1) };
}

/**
 * The moment at which club membership is checked for an enrollment:
 * 1 July `season` 00:00, Brussels time.
 *
 * C925, C950. Midnight in Brussels is how memberships are stored (research R3).
 */
export function membershipCheckInstant(season: Season): Date {
  return storedInstant(membershipPeriod(season).from);
}

/**
 * Whether results of `season` may still be pushed to toernooi.nl at `at`, i.e.
 * whether the season is not closed yet there: it closes on 1 July of
 * `season + 1` (docs/result-entry-rules.md). It does not decide who may enter
 * a result in Badman.
 *
 * There is no lower bound on purpose: who may enter or correct a result, and
 * until when, is decided per encounter (the game leader until 36 hours after
 * the planned start, the sports commission without a deadline; C320 art. 62,
 * docs/result-entry-rules.md), not per season.
 *
 * Practical rule, no regulation: the competition ends on 30 April, but an
 * encounter can exceptionally still be played in May (Badminton Vlaanderen,
 * BAD-397), and its result and corrections still have to be entered after
 * that. Closing on 1 July leaves room for both.
 */
export function isScoreEntrySeasonOpen(
  at: Date | CalendarDate,
  season: Season,
  timeZone: string = BRUSSELS_TIME_ZONE
): boolean {
  assertSeason(season);
  return resolveCalendarDate(at, timeZone) < calendarDate(season + 1, 7, 1);
}

/**
 * The oldest season whose results can still be entered at `at`: switches on
 * 1 July.
 *
 * Practical rule, no regulation (see `isScoreEntrySeasonOpen`).
 */
export function oldestOpenScoreEntrySeason(
  at: Date | CalendarDate,
  timeZone: string = BRUSSELS_TIME_ZONE
): Season {
  const { year, month } = parseCalendarDate(resolveCalendarDate(at, timeZone));
  return month >= 7 ? year : year - 1;
}

/**
 * The "next" season: switches on 1 October. 30 September 2026 → 2026,
 * 1 October 2026 → 2027. Defaults to the current moment.
 *
 * Practical rule, no regulation. Kept from `getNextSeason`; whether it is still
 * needed is not decided (spec 039 assumptions).
 */
export function nextSeason(
  at: Date | CalendarDate = new Date(),
  timeZone: string = BRUSSELS_TIME_ZONE
): Season {
  const { year, month } = parseCalendarDate(resolveCalendarDate(at, timeZone));
  return month >= 10 ? year + 1 : year;
}

/**
 * The encounters the Twizzit export sends for a season: 1 September `season`
 * 00:00 up to and including 1 September `season + 1` 00:00, Brussels time.
 *
 * Practical rule for the Twizzit export, no regulation. Midnight in Brussels is
 * today's value (research R3), see `storedInstant`.
 */
export function twizzitExportWindow(season: Season): InstantRange {
  assertSeason(season);
  return {
    start: storedInstant(calendarDate(season, 9, 1)),
    end: storedInstant(calendarDate(season + 1, 9, 1)),
  };
}
