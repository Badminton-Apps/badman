import { SyncQueue } from "@badman/backend-queue";
import { InjectQueue, OnGlobalQueueError, OnGlobalQueueFailed, Processor } from "@nestjs/bull";
import * as Sentry from "@sentry/nestjs";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Job, Queue } from "bull";

@Processor({
  name: SyncQueue,
})
export class GlobalConsumer implements OnModuleInit {
  private readonly logger = new Logger(GlobalConsumer.name);

  constructor(@InjectQueue(SyncQueue) private readonly queue: Queue) {}

  onModuleInit() {
    this.queue.on("stalled", (job: Job) => {
      this.logger.warn(`Job ${job.id} (${job.name}) stalled`);
    });
  }


  @OnGlobalQueueError()
  onGlobalError(err: Error | undefined) {
    const message = err instanceof Error ? err.message : err != null ? String(err) : "unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    this.logger.error(`Queue error: ${message}`, stack);
    Sentry.setTag("queue", SyncQueue);
    if (err) {
      Sentry.captureException(err);
    } else {
      Sentry.captureMessage(`Queue error: ${message}`, "error");
    }
  }

  @OnGlobalQueueFailed()
  async onError(jobId: string, err: Error | undefined) {
    const errorMessage =
      err instanceof Error ? err.message : err != null ? String(err) : "unknown error";
    const errorStack = err instanceof Error ? err.stack : undefined;

    try {
      const job = await this.queue.getJob(jobId);
      const jobName = job?.name ?? "unknown";
      let jobData = "unavailable";

      if (job?.data) {
        try {
          jobData = JSON.stringify(job.data);
        } catch (stringifyError) {
          jobData = `[unable to serialize: ${(stringifyError as Error)?.message}]`;
        }
      }

      const attemptsMade = job?.attemptsMade ?? "?";
      const attemptsTotal = job?.opts?.attempts ?? "?";
      this.logger.error(
        `Job ${jobId} (${jobName}) failed [attempt ${attemptsMade}/${attemptsTotal}] — data: ${jobData} — error: ${errorMessage}`,
        errorStack
      );

      const errorIdentifier = getErrorIdentifier(err);
      Sentry.withScope((scope) => {
        scope.setFingerprint(["sync-job-failed", jobName, errorIdentifier]);
        scope.setTag("queue", SyncQueue);
        scope.setTag("job_name", jobName);
        scope.setTag("error_identifier", errorIdentifier);
        scope.setContext("bullJob", {
          jobId,
          jobName,
          attemptsMade: String(attemptsMade),
          attemptsTotal: String(attemptsTotal),
          data: jobData,
        });
        if (err) {
          Sentry.captureException(err);
        } else {
          Sentry.captureMessage(`Job ${jobId} (${jobName}) failed: ${errorMessage}`, "error");
        }
      });
    } catch (lookupError) {
      this.logger.error(
        `Job ${jobId} failed — error: ${errorMessage} (could not fetch job details: ${(lookupError as Error)?.message})`,
        errorStack
      );
      const errorIdentifier = getErrorIdentifier(err);
      Sentry.withScope((scope) => {
        scope.setFingerprint(["sync-job-failed", "unknown", errorIdentifier]);
        scope.setTag("queue", SyncQueue);
        scope.setTag("job_name", "unknown");
        scope.setTag("error_identifier", errorIdentifier);
        scope.setContext("bullJob", { jobId, errorMessage });
        if (err) {
          Sentry.captureException(err);
        } else {
          Sentry.captureMessage(`Job ${jobId} failed: ${errorMessage}`, "error");
        }
      });
    }
  }
}

/** Derive a stable key for Sentry grouping so different errors become different issues. */
function getErrorIdentifier(err: Error | undefined): string {
  if (err == null) return "unknown";
  const withCode = err as Error & { code?: string };
  if (typeof withCode.code === "string") return `${err.name}:${withCode.code}`;
  if (err.name && err.name !== "Error") return err.name;
  return "Error";
}
