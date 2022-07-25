import {
  OnGlobalQueueError,
  OnGlobalQueueFailed,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { SyncQueue } from '@badman/queue';

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
}
