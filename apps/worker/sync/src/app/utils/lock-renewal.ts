import { Job } from "bull";

/** Extend lock duration in ms (should match or be less than queue's lockDuration). */
const LOCK_EXTEND_MS = 5 * 60 * 1000; // 5 minutes
/** How often to renew the lock (must be less than LOCK_EXTEND_MS). */
const RENEW_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Starts periodically extending the job lock so long-running processors don't stall.
 * Call the returned function in a finally block to stop renewal.
 */
export function startLockRenewal(job: Job): () => void {
  const intervalId = setInterval(async () => {
    try {
      await job.extendLock(LOCK_EXTEND_MS);
    } catch {
      // Ignore errors (e.g. job already completed); clearInterval will stop renewal
    }
  }, RENEW_INTERVAL_MS);

  return () => clearInterval(intervalId);
}
