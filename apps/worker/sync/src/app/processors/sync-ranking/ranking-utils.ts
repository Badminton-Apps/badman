import { getMonth, isEqual, isAfter, isBefore, setDate, getDay, addDays, startOfDay } from "date-fns";

/**
 * Determines whether a ranking publication should be used to update player rankings.
 *
 * Publications are used for updates only when they fall on or just after the first
 * Monday of a month that is in the updateMonths list. A 2-day margin is allowed
 * (i.e., the publication can also be on Tuesday or Wednesday of that week).
 *
 * Individual dates can be overridden via the goodDates / badDates lists.
 *
 * @param date         The publication date as a Date object.
 * @param updateMonths 0-indexed months in which updates are expected (e.g. [0,2,4,6,8,10]).
 * @param goodDates    ISO date strings that are always treated as update-worthy.
 * @param badDates     ISO date strings that are always excluded from updates.
 */
export function isPublicationUsedForUpdate(
  date: Date,
  updateMonths: number[],
  goodDates: string[],
  badDates: string[]
): boolean {
  let canUpdate = false;

  if (updateMonths.includes(getMonth(date))) {
    const firstOfMonth = setDate(new Date(date), 1);
    const dayOfWeek = getDay(firstOfMonth); // 0=Sun,1=Mon,...,6=Sat
    // Days until next Monday: if already Monday (1) → 0, else calculate
    const daysUntilMonday = dayOfWeek === 1 ? 0 : dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    const firstMondayOfMonth = addDays(firstOfMonth, daysUntilMonday);
    const margin = addDays(firstMondayOfMonth, 2);
    canUpdate = isEqual(startOfDay(date), startOfDay(firstMondayOfMonth)) ||
      (isAfter(date, firstMondayOfMonth) && isBefore(date, margin));
  }

  if (goodDates.includes(date.toISOString())) {
    canUpdate = true;
  }
  if (badDates.includes(date.toISOString())) {
    canUpdate = false;
  }

  return canUpdate;
}
