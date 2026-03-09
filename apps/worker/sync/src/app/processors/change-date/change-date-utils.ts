import { formatInTimeZone } from "date-fns-tz";

/**
 * Formats an encounter date in the given IANA timezone using the Visual Reality
 * API format ("yyyy-MM-dd'T'HH:mm:ss").
 *
 * This value is embedded directly in XML sent to the VR API, so any timezone
 * error will be silently accepted and stored with the wrong time.
 *
 * @param date     The encounter date (stored in UTC / as a JS Date).
 * @param timezone IANA timezone name, e.g. "Europe/Brussels".
 * @param fmt      date-fns format string, defaults to "yyyy-MM-dd'T'HH:mm:ss".
 */
export function formatEncounterDateForApi(
  date: Date,
  timezone: string,
  fmt = "yyyy-MM-dd'T'HH:mm:ss"
): string {
  return formatInTimeZone(date, timezone, fmt);
}
