import moment from "moment-timezone";

/**
 * Formats an encounter date in the given IANA timezone using the Visual Reality
 * API format ("YYYY-MM-DDTHH:mm:ss").
 *
 * This value is embedded directly in XML sent to the VR API, so any timezone
 * error will be silently accepted and stored with the wrong time.
 *
 * @param date     The encounter date (stored in UTC / as a JS Date).
 * @param timezone IANA timezone name, e.g. "Europe/Brussels".
 * @param fmt      moment format string, defaults to "YYYY-MM-DDTHH:mm:ss".
 */
export function formatEncounterDateForApi(
  date: Date,
  timezone: string,
  fmt = "YYYY-MM-DDTHH:mm:ss"
): string {
  return moment(date).tz(timezone).format(fmt);
}
