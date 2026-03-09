import { SyncQueue } from "@badman/backend-queue";
import { InjectQueue, OnGlobalQueueError, OnGlobalQueueFailed, Processor } from "@nestjs/bull";
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
  onGlobalError(err: Error) {
    this.logger.error(`Queue error: ${err.message}`, err.stack);
  }

  @OnGlobalQueueFailed()
  async onError(jobId: string, err: Error) {
    try {
      const job = await this.queue.getJob(jobId);
      const jobName = job?.name ?? "unknown";
      const jobData = job ? JSON.stringify(job.data) : "unavailable";
      const attemptsMade = job?.attemptsMade ?? "?";
      const attemptsTotal = job?.opts?.attempts ?? "?";
      this.logger.error(
        `Job ${jobId} (${jobName}) failed [attempt ${attemptsMade}/${attemptsTotal}] — data: ${jobData} — error: ${err.message}`,
        err.stack
      );
    } catch (lookupError) {
      this.logger.error(`Job ${jobId} failed — error: ${err.message} (could not fetch job details: ${lookupError?.message})`, err.stack);
    }
  }
}
