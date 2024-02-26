import { SyncQueue } from '@badman/backend-queue';
import { OnGlobalQueueError, OnGlobalQueueFailed, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

@Processor({
  name: SyncQueue,
})
export class GlobalConsumer {
  private readonly logger = new Logger(GlobalConsumer.name);

  @OnGlobalQueueError()
  onGlobalError(err: Error) {
    this.logger.error(err);
  }

  @OnGlobalQueueFailed()
  onError(job: string, err: Error) {
    this.logger.error(`Job ${job} failed`, err);
  }

  // @OnQueueActive()
  // handleQueueActive(job: Job) {
  //   this.logger.log(`[SYNC] Queue ${job.name} is active`);

  //   // super.handleQueueActive(job);
  // }
}
