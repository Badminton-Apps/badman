import { format, parse, setHours, setMinutes, getHours, getMinutes, isAfter, isBefore, addMinutes, subMinutes } from "date-fns";

/**
 * Returns true when an encounter's start time falls within a ±15-minute window
 * around a location's availability slot on the correct day.
 *
 * @param encounterDate  The scheduled date/time of the encounter.
 * @param availabilityDay  The day name stored on the Availability record (e.g. "monday").
 * @param startTimeStr   The slot's start time in "HH:mm" format (e.g. "19:30").
 */
export function matchesAvailabilityWindow(
  encounterDate: Date,
  availabilityDay: string,
  startTimeStr: string
): boolean {
  // Day-of-week guard
  if (availabilityDay !== format(new Date(encounterDate), "EEEE").toLowerCase()) {
    return false;
  }

  // Build the slot start time on the same calendar day as the encounter
  const parsed = parse(startTimeStr, "HH:mm", new Date());
  let startTime = setHours(new Date(encounterDate), getHours(parsed));
  startTime = setMinutes(startTime, getMinutes(parsed));
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);

  return isAfter(new Date(encounterDate), subMinutes(startTime, 15)) && isBefore(new Date(encounterDate), addMinutes(startTime, 15));
}
