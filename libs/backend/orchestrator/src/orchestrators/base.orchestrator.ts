import { OnGlobalQueueDrained, OnGlobalQueueWaiting } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

export class OrchestratorBase {
  protected logger = new Logger(OrchestratorBase.name);
  private timeout?: NodeJS.Timeout;
  private hasStarted = false;

  // abstract classes for complete and active
  startServer() {}
  stopServer() {}

  @OnGlobalQueueWaiting()
  queueWaiting() {
    if (!this.hasStarted) {
      this.startServer();
      this.hasStarted = true;
    }
    clearTimeout(this.timeout);
  }

  @OnGlobalQueueDrained()
  finished() {
    clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      this.stopServer();
      this.hasStarted = false;
    }, 2_100_000); // 35 minutes
  }
}
