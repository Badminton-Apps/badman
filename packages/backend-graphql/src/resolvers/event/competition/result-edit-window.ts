import { EncounterCompetition } from "@badman/backend-database";
import { GraphQLError } from "graphql";
import { ErrorCode } from "../../../utils/error-codes";

// BV competition rules (C320 art. 62): the game leader enters and may correct the result
// until 36 hours after the encounter's planned start; after that only the sports commission.
const RESULT_EDIT_WINDOW_HOURS = 36;

export function resultEditDeadline(date: Date | undefined | null): Date | null {
  if (!date) return null;
  return new Date(new Date(date).getTime() + RESULT_EDIT_WINDOW_HOURS * 60 * 60 * 1000);
}

export function assertResultEditWindowOpen(
  encounter: Pick<EncounterCompetition, "id" | "date">,
  now: Date = new Date()
): void {
  const deadline = resultEditDeadline(encounter.date);
  if (!deadline || now <= deadline) return;

  throw new GraphQLError(
    `The result of encounter ${encounter.id} can only be changed by the sports commission since ${deadline.toISOString()}`,
    {
      extensions: {
        code: ErrorCode.RESULT_EDIT_WINDOW_CLOSED,
        encounterId: encounter.id,
        deadline: deadline.toISOString(),
      },
    }
  );
}
