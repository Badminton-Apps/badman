import { Queue } from "bull";
import { Sync } from "./events";
import { getSyncJobOptions } from "./sync-job-options";

export type EnterScoresRequest =
  | { outcome: "queued" }
  | { outcome: "retried"; failedReason: string | undefined }
  | { outcome: "skipped"; reason: string };

export type EnterScoresRequestOutcome = EnterScoresRequest["outcome"];

// Matches the message of EnterScoresErrorCode.RESULT_ALREADY_PRESENT in worker-sync; the worker's
// enter-scores.errors spec fails when the two drift apart.
const RESULT_ALREADY_PRESENT_PREFIX = "[RESULT_ALREADY_PRESENT]";

export function enterScoresJobId(encounterId: string): string {
  return `enter-scores-${encounterId}`;
}

export function isResultAlreadyPresent(failedReason: string | undefined): boolean {
  return failedReason?.startsWith(RESULT_ALREADY_PRESENT_PREFIX) ?? false;
}

export async function requestEnterScores(
  queue: Queue,
  encounterId: string
): Promise<EnterScoresRequest> {
  const jobId = enterScoresJobId(encounterId);
  const existingJob = await queue.getJob(jobId);

  if (!existingJob) {
    await queue.add(Sync.EnterScores, { encounterId }, getSyncJobOptions({ jobId }));
    return { outcome: "queued" };
  }

  const state = await existingJob.getState();
  if (state !== "failed") {
    return { outcome: "skipped", reason: `EnterScores job is ${state}` };
  }
  if (isResultAlreadyPresent(existingJob.failedReason)) {
    return { outcome: "skipped", reason: "toernooi.nl already has a result" };
  }

  // add() is a no-op while a job with the same id exists, so a failed job must be retried.
  await existingJob.retry();
  return { outcome: "retried", failedReason: existingJob.failedReason };
}
