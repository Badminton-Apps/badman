import { EventsGateway } from '@badman/backend-websockets';
import { Service } from '@badman/backend-database';
import { EVENTS } from '@badman/utils';
import { OnGlobalQueueDrained, OnGlobalQueueWaiting } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Services } from '../services';
import { Queue } from 'bull';
import { RenderService } from '../services/render.service';
import { Cron } from '@nestjs/schedule';
import { ConfigType } from '@badman/utils';

export class OrchestratorBase {
  protected logger = new Logger(OrchestratorBase.name);
  private timeout?: NodeJS.Timeout;
  private timeoutTime = 1000 * 60 * 5; // 5 minutes
  private hasStarted = false;

  constructor(
    protected readonly serviceName: Services,
    private readonly configSerivce: ConfigService<ConfigType>,
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
    this._checkAndStartStopIfNeeded();
  }

  // check each hour if the queue is empty
  @Cron('0 * * * *')
  async checkQueue() {
    this._checkAndStartStopIfNeeded();
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
      id: service.id,
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
  queueDrained() {
    this.logger.log(`[${this.serviceName}] Queue drained`);

    clearTimeout(this.timeout);

    this.timeout = setTimeout(async () => {
      // chekc if there are still jobs in the queue
      const jobs = await this.queue.getJobCounts();

      this.logger.debug(
        `[${this.serviceName}] Jobs in queue: ${jobs.waiting}, ${jobs.active}, ${jobs.completed}, ${jobs.failed}`,
      );

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

  private _checkAndStartStopIfNeeded() {
    this.queue.getJobCounts().then((counts) => {
      if (counts.waiting > 0) {
        this.logger.debug(
          `[${this.serviceName}] Found ${counts.waiting} jobs in queue, starting worker`,
        );
        this.queueWaiting();
      } else {
        this.logger.debug(
          `[${this.serviceName}] No jobs in queue, stopping worker`,
        );
        this.queueDrained();
      }
    });
  }
}
