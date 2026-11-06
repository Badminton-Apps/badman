import { Queue } from "bull";
import {
  enterScoresJobId,
  isResultAlreadyPresent,
  requestEnterScores,
} from "./enter-scores-request";
import { Sync } from "./events";

function makeExistingJob(state: string, failedReason?: string) {
  return {
    failedReason,
    getState: jest.fn().mockResolvedValue(state),
    retry: jest.fn().mockResolvedValue(undefined),
  };
}

function makeQueue(existingJob: ReturnType<typeof makeExistingJob> | null = null) {
  return {
    getJob: jest.fn().mockResolvedValue(existingJob),
    add: jest.fn().mockResolvedValue(undefined),
  };
}

describe("enterScoresJobId", () => {
  it("is the same id for every request of one encounter", () => {
    expect(enterScoresJobId("enc-1")).toBe("enter-scores-enc-1");
  });
});

describe("isResultAlreadyPresent", () => {
  it("is true when the push was skipped because toernooi.nl already has a result", () => {
    expect(isResultAlreadyPresent("[RESULT_ALREADY_PRESENT] 2 games filled")).toBe(true);
  });

  it.each([
    ["a closed season", "[SEASON_CLOSED] season 2024"],
    ["a real failure", "[SAVE_FAILED] save did not stick"],
    ["the code mid-message", "foo [RESULT_ALREADY_PRESENT] bar"],
    ["no reason", undefined],
  ])("is false for %s", (_, failedReason) => {
    expect(isResultAlreadyPresent(failedReason)).toBe(false);
  });
});

describe("requestEnterScores", () => {
  it("adds a job with the sync retry options when the encounter has none", async () => {
    const queue = makeQueue();

    await expect(requestEnterScores(queue as unknown as Queue, "enc-1")).resolves.toEqual({
      outcome: "queued",
    });

    expect(queue.getJob).toHaveBeenCalledWith("enter-scores-enc-1");
    expect(queue.add).toHaveBeenCalledWith(
      Sync.EnterScores,
      { encounterId: "enc-1" },
      expect.objectContaining({
        jobId: "enter-scores-enc-1",
        attempts: 3,
        backoff: { type: "exponential", delay: 60000 },
        removeOnComplete: true,
        removeOnFail: false,
      })
    );
  });

  it("retries a failed job, since add() is ignored while a job with the same id exists", async () => {
    const failed = makeExistingJob("failed", "[SAVE_FAILED] save did not stick");
    const queue = makeQueue(failed);

    await expect(requestEnterScores(queue as unknown as Queue, "enc-1")).resolves.toEqual({
      outcome: "retried",
      failedReason: "[SAVE_FAILED] save did not stick",
    });

    expect(failed.retry).toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("leaves a failed job alone when toernooi.nl already had a result", async () => {
    const skipped = makeExistingJob("failed", "[RESULT_ALREADY_PRESENT] 2 games filled");
    const queue = makeQueue(skipped);

    await expect(requestEnterScores(queue as unknown as Queue, "enc-1")).resolves.toEqual({
      outcome: "skipped",
      reason: "toernooi.nl already has a result",
    });

    expect(skipped.retry).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it.each(["active", "waiting", "delayed"])(
    "leaves a job that is still %s alone",
    async (state) => {
      const pending = makeExistingJob(state);
      const queue = makeQueue(pending);

      await expect(requestEnterScores(queue as unknown as Queue, "enc-1")).resolves.toEqual({
        outcome: "skipped",
        reason: `EnterScores job is ${state}`,
      });

      expect(pending.retry).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    }
  );
});
