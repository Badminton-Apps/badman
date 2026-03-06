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
    this.logger.error(err);
  }

  @OnGlobalQueueFailed()
  onError(job: string, err: Error) {
    this.logger.error(`Job ${job} failed`, err);
  }
}
