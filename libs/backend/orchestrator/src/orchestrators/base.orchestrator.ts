import { Service } from '@badman/backend-database';
import { EventsGateway } from '@badman/backend-websockets';
import { ConfigType, EVENTS } from '@badman/utils';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bull';
import { Services } from '../services';
import { RenderService } from '../services/render.service';

export class OrchestratorBase {
  protected logger = new Logger(OrchestratorBase.name);
  private hasStarted = false;
  private timeoutTime = 1000 * 60 * 5 ; // 5 minutes
  private startTime = new Date();

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
      // reset start time
      this.startTime = new Date();

      if (!this.hasStarted) {
        this.logger.debug(
          `[${this.serviceName}] Found ${counts.waiting} waiting and ${counts.active} active jobs in queue, starting worker`,
        );
        this.startServer();
        this.hasStarted = true;
      }
    } else {
      if (this.hasStarted) {
        const now = new Date();
        const diff = now.getTime() - this.startTime.getTime();

        if (diff < this.timeoutTime) {
          return;
        }

        this.logger.debug(
          `[${this.serviceName}] No more jobs in queue, stopping worker`,
        );
        this.stopServer();
        this.hasStarted = false;
      }
    }
  }
}
