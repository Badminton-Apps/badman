import moment, { Moment } from "moment";

/**
 * Determines whether a ranking publication should be used to update player rankings.
 *
 * Publications are used for updates only when they fall on or just after the first
 * Monday of a month that is in the updateMonths list. A 2-day margin is allowed
 * (i.e., the publication can also be on Tuesday or Wednesday of that week).
 *
 * Individual dates can be overridden via the goodDates / badDates lists.
 *
 * @param date         The publication date as a Moment object.
 * @param updateMonths 0-indexed months in which updates are expected (e.g. [0,2,4,6,8,10]).
 * @param goodDates    ISO date strings that are always treated as update-worthy.
 * @param badDates     ISO date strings that are always excluded from updates.
 */
export function isPublicationUsedForUpdate(
  date: Moment,
  updateMonths: number[],
  goodDates: string[],
  badDates: string[]
): boolean {
  let canUpdate = false;

  if (updateMonths.includes(date.month())) {
    // Find the first Monday of the month.
    // .date(1).day(8) advances to the next Monday, but if it overshoots into the
    // second week (date > 7) we step back one week with .day(-6).
    const firstMondayOfMonth = date.clone().date(1).day(8);
    if (firstMondayOfMonth.date() > 7) {
      firstMondayOfMonth.day(-6);
    }

    // Allow the publication date to fall on the first Monday or within 2 days after it.
    const margin = firstMondayOfMonth.clone().add(2, "days");
    canUpdate =
      date.isSame(firstMondayOfMonth) || date.isBetween(firstMondayOfMonth, margin);
  }

  if (goodDates.includes(date.toISOString())) {
    canUpdate = true;
  }
  if (badDates.includes(date.toISOString())) {
    canUpdate = false;
  }

  return canUpdate;
}
