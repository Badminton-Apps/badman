import moment from "moment";

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
  const momentDate = moment(encounterDate);

  // Day-of-week guard
  if (availabilityDay !== momentDate.format("dddd").toLowerCase()) {
    return false;
  }

  // Build the slot start time on the same calendar day as the encounter
  const startTime = momentDate.clone().set({
    hour: moment(startTimeStr, "HH:mm").hour(),
    minute: moment(startTimeStr, "HH:mm").minute(),
    second: 0,
    millisecond: 0,
  });

  return momentDate.isBetween(
    startTime.clone().subtract(15, "minutes"),
    startTime.clone().add(15, "minutes")
  );
}
