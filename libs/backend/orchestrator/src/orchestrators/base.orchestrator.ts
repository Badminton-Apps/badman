import { OnGlobalQueueDrained, OnGlobalQueueWaiting } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class OrchestratorBase {
  protected logger = new Logger(OrchestratorBase.name);
  private timeout?: NodeJS.Timeout;
  private timeoutTime = 1000 * 60 * 5; // 5 minutes
  private hasStarted = false;

  constructor(private readonly configSerivce: ConfigService) {
    const configuredTimeout = this.configSerivce.get<string>('RENDER_WAIT_TIME');

    if (configuredTimeout) {
      this.timeoutTime = parseInt(configuredTimeout);
    }
  }

  // abstract classes for complete and active
  startServer() {}
  stopServer() {}

  @OnGlobalQueueWaiting()
  queueWaiting() {
    this.logger.log(`[${this.constructor.name}] Queue waiting`);

    if (!this.hasStarted) {
      this.startServer();
      this.hasStarted = true;
    }
    clearTimeout(this.timeout);
  }

  @OnGlobalQueueDrained()
  finished() {
    this.logger.log(`[${this.constructor.name}] Queue drained`);

    clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      this.stopServer();
      this.hasStarted = false;
    }, ); 
  }
}
