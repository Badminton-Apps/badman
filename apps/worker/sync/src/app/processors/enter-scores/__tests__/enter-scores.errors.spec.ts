import { isResultAlreadyPresent } from "@badman/backend-queue";
import { EnterScoresError, EnterScoresErrorCode } from "../enter-scores.errors";

describe("EnterScoresError", () => {
  it("prefixes the message with the error code so it survives in the job's failedReason", () => {
    const error = new EnterScoresError(EnterScoresErrorCode.SAVE_FAILED, "Save did not stick");

    expect(error.message).toBe("[SAVE_FAILED] Save did not stick");
    expect(error.code).toBe(EnterScoresErrorCode.SAVE_FAILED);
  });
});

describe("isResultAlreadyPresent from @badman/backend-queue", () => {
  it("is true for a push skipped because toernooi.nl already has a result", () => {
    const { message } = new EnterScoresError(EnterScoresErrorCode.RESULT_ALREADY_PRESENT, "x");

    expect(isResultAlreadyPresent(message)).toBe(true);
  });

  it.each([
    [
      "a closed season, which can reopen when an admin corrects it",
      new EnterScoresError(EnterScoresErrorCode.SEASON_CLOSED, "x").message,
    ],
    ["a real failure", new EnterScoresError(EnterScoresErrorCode.SAVE_FAILED, "x").message],
    ["a non-EnterScores error", "Navigation timeout of 30000 ms exceeded"],
    ["a code mentioned mid-message", "foo [RESULT_ALREADY_PRESENT] bar"],
    ["no reason", undefined],
  ])("is false for %s", (_, failedReason) => {
    expect(isResultAlreadyPresent(failedReason)).toBe(false);
  });
});
