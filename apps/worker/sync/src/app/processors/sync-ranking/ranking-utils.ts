import {
  getMonth,
  isEqual,
  isAfter,
  isBefore,
  setDate,
  getDay,
  addDays,
  startOfDay,
  parseISO,
  parse,
  isValid,
} from "date-fns";

/**
 * Tolerant publication-date parser. Accepts:
 *   - ISO datetime strings ("yyyy-MM-dd'T'HH:mm:ss[.SSSZ]") as returned by the
 *     JSON branch of the Visual API
 *   - Date-only strings ("yyyy-MM-dd") as returned by the XML branch
 *   - Date objects (defensive)
 *   - epoch numbers (defensive)
 *
 * Returns null when the input cannot be parsed — callers should skip the
 * publication rather than crash the whole sync step.
 */
export function parsePublicationDate(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) {
    return isValid(raw) ? raw : null;
  }
  if (typeof raw === "number") {
    const d = new Date(raw);
    return isValid(d) ? d : null;
  }
  const s = String(raw).trim();
  if (!s) return null;

  const iso = parseISO(s);
  if (isValid(iso)) return iso;

  const fallback = parse(s, "yyyy-MM-dd", new Date());
  return isValid(fallback) ? fallback : null;
}

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
  // Defensive: an invalid Date would crash on `.toISOString()` below and take
  // the entire publications step down. Treat it as "not used for update".
  if (!isValid(date)) {
    return false;
  }

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
