import { differenceInHours, addHours, isValid, isBefore, isEqual } from "date-fns";

export interface EncounterCheckInput {
  /** Whether the event has checkEncounterForFilledIn enabled */
  checkEncounterForFilledIn: boolean;
  /** Whether the encounter has been entered on toernooi.nl */
  entered: boolean;
  /** Whether the encounter has been accepted on toernooi.nl */
  accepted: boolean;
  /** Whether the encounter has a comment */
  hasComment: boolean;
  /** The encounter date */
  encounterDate: Date;
  /** The date the encounter was entered (if entered) */
  enteredOn: string | Date | null;
  /** Whether the away club has a slug (needed for auto-accept) */
  awayClubHasSlug: boolean;
  /** Whether auto-accept is enabled via config */
  autoAcceptEnabled: boolean;
  /** The current time (injectable for testing) */
  now?: Date;
}

export type EncounterCheckAction =
  | { action: "none" }
  | { action: "notify-has-comment" }
  | { action: "notify-not-entered" }
  | { action: "notify-not-accepted" }
  | { action: "auto-accept" }
  | { action: "auto-accept-disabled" }
  | { action: "auto-accept-too-early"; hoursPassedSinceEntered: number };

/**
 * Determines what action to take for an encounter check.
 *
 * Decision tree:
 * 1. If checkEncounterForFilledIn is false → none
 * 2. If has comment → notify-has-comment
 * 3. If not entered and >24h passed and no comment → notify-not-entered
 * 4. If not accepted and >48h passed and no comment:
 *    a. If away club has slug and entered date is valid:
 *       - Calculate effective hours since entered (adjusted if entered late)
 *       - If >36h: auto-accept (if enabled) or auto-accept-disabled
 *       - If <=36h: auto-accept-too-early
 *    b. Otherwise → notify-not-accepted
 */
export function determineEncounterAction(input: EncounterCheckInput): EncounterCheckAction {
  const now = input.now ?? new Date();

  if (!input.checkEncounterForFilledIn) {
    return { action: "none" };
  }

  if (input.hasComment) {
    return { action: "notify-has-comment" };
  }

  const hoursPassed = differenceInHours(now, input.encounterDate);

  if (!input.entered && hoursPassed > 24 && !input.hasComment) {
    return { action: "notify-not-entered" };
  }

  if (!input.accepted && hoursPassed > 48 && !input.hasComment) {
    const enteredDate = input.enteredOn ? new Date(input.enteredOn) : null;

    if (input.awayClubHasSlug && enteredDate && isValid(enteredDate)) {
      let hoursPassedEntered = differenceInHours(now, enteredDate);

      // Was it entered on time (within 36h of encounter)?
      const deadline = addHours(input.encounterDate, 36);
      const enteredOnTime = isBefore(enteredDate, deadline) || isEqual(enteredDate, deadline);

      if (!enteredOnTime) {
        // If entered late, give 36 more hours from when it was entered
        hoursPassedEntered = differenceInHours(now, addHours(enteredDate, 36));
      }

      if (hoursPassedEntered > 36) {
        if (input.autoAcceptEnabled) {
          return { action: "auto-accept" };
        }
        return { action: "auto-accept-disabled" };
      }

      return { action: "auto-accept-too-early", hoursPassedSinceEntered: hoursPassedEntered };
    }

    return { action: "notify-not-accepted" };
  }

  return { action: "none" };
}
