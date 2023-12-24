import { Service } from '@badman/backend-database';
import { EventsGateway } from '@badman/backend-websockets';
import { EVENTS } from '@badman/utils';
import { OnGlobalQueueWaiting } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bull';
import { Services } from '../services';
import { RenderService } from '../services/render.service';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@badman/utils';

export class OrchestratorBase {
  protected logger = new Logger(OrchestratorBase.name);
  private hasStarted = false;
  private timeout?: NodeJS.Timeout;
  private timeoutTime = 1000 * 60 * 5; // 5 minutes

  constructor(
    protected readonly serviceName: Services,
    protected readonly configSerivce: ConfigService<ConfigType>,
    private readonly gateway: EventsGateway,
    private readonly queue: Queue,
    private readonly renderService: RenderService,
  ) {
    const configuredTimeout =
      this.configSerivce.get<string>('RENDER_WAIT_TIME');

    if (configuredTimeout) {
      this.timeoutTime = parseInt(configuredTimeout);
    }
  }

  @Cron('*/1 * * * *')
  async checkQueue() {
    await this._checkAndStartStopIfNeeded();
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
  async queueWaiting() {
    if (!this.hasStarted) {
      await this._checkAndStartStopIfNeeded();
    }
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

  private async _checkAndStartStopIfNeeded() {
    const counts = await this.queue.getJobCounts();

    if (counts.waiting > 0 || counts.active > 0) {
      // clear timeout if it exists because we have jobs in queue
      clearTimeout(this.timeout);
      if (!this.hasStarted) {
        this.logger.debug(
          `[${this.serviceName}] Found ${counts.waiting} jobs in queue, starting worker`,
        );
        this.startServer();
        this.hasStarted = true;
      }
    } else {
      if (this.hasStarted) {
        this.timeout = setTimeout(() => {
          this.logger.debug(
            `[${this.serviceName}] No more jobs in queue, stopping worker`,
          );
          this.stopServer();
          this.hasStarted = false;
        }, this.timeoutTime);
      }
    }
  }
}
