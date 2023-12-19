import { EventsGateway } from '@badman/backend-websockets';
import { Service } from '@badman/backend-database';
import { EVENTS } from '@badman/utils';
import { OnGlobalQueueDrained, OnGlobalQueueWaiting } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Services } from '../services';
import { Queue } from 'bull';
import { RenderService } from '../services/render.service';

export class OrchestratorBase {
  protected logger = new Logger(OrchestratorBase.name);
  private timeout?: NodeJS.Timeout;
  private timeoutTime = 1000 * 60 * 5; // 5 minutes
  private hasStarted = false;

  constructor(
    protected readonly serviceName: Services,
    private readonly configSerivce: ConfigService,
    private readonly gateway: EventsGateway,
    private queue: Queue,
    private readonly renderService: RenderService,
  ) {
    const configuredTimeout =
      this.configSerivce.get<string>('RENDER_WAIT_TIME');

    if (configuredTimeout) {
      this.timeoutTime = parseInt(configuredTimeout);
    }

    // if any jobs are left in the queue, start the server
    this.queue.getJobCounts().then((counts) => {
      if (counts.waiting > 0) {
        this.logger.log(
          `[${this.serviceName}] Found ${counts.waiting} jobs in queue, starting worker`,
        );
        this.queueWaiting();
      } else {
        this.logger.log(
          `[${this.serviceName}] No jobs in queue, stopping worker`,
        );
        this.stopServer();
      }
    });
  }

  async startServer(): Promise<void> {
    this.logger.log(
      `[${this.serviceName}] Starting worker for queue ${this.queue.name}`,
    );

    const service = await this._getService();
    await this.renderService.startService(service);
    this.gateway.server.emit(EVENTS.SERVICE.SERVICE_STARTING, {
      id: service.id,
      service: this.serviceName,
    });
  }

  async stopServer(): Promise<void> {
    this.logger.log(
      `[${this.serviceName}] Stopping worker for queue ${this.queue.name}`,
    );
    const service = await this._getService();
    await this.renderService.suspendService(service);
    this.gateway.server?.emit(EVENTS.SERVICE.SERVICE_STOPPED, {
      service: this.serviceName,
    });
  }

  @OnGlobalQueueWaiting()
  queueWaiting() {
    this.logger.log(`[${this.serviceName}] Queue waiting`);

    if (!this.hasStarted) {
      this.startServer();
      this.hasStarted = true;
    }
    clearTimeout(this.timeout);
  }

  @OnGlobalQueueDrained()
  finished() {
    this.logger.log(`[${this.serviceName}] Queue drained`);

    clearTimeout(this.timeout);

    this.timeout = setTimeout(async () => {
      // chekc if there are still jobs in the queue
      const jobs = await this.queue.getJobCounts();

      this.logger.debug(`[${this.serviceName}] Jobs in queue: ${jobs.waiting}, ${jobs.active}, ${jobs.completed}, ${jobs.failed}`);

      this.stopServer();
      this.hasStarted = false;
    }, this.timeoutTime);
  }

  private async _getService() {
    let service = await Service.findOne({ where: { name: this.serviceName } });
    // create service if it doesn't exist
    if (!service) {
      service = await Service.create({
        name: this.serviceName,
        status: 'stopped',
      });
    }

    return service;
  }
}
