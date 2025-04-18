import { Service } from '@badman/backend-database';
import { EventsGateway } from '@badman/backend-websockets';
import { ConfigType, EVENTS } from '@badman/utils';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bull';
import { Services } from '../services';
import { RenderService } from '../services/render.service';

export class OrchestratorBase implements OnModuleInit {
  protected logger = new Logger(OrchestratorBase.name);
  private hasStarted = false;
  private timeoutTime = 1000 * 60 * 5; // 5 minutes
  private startTime = new Date();

  constructor(
    protected readonly serviceName: Services,
    protected readonly configService: ConfigService<ConfigType>,
    private readonly gateway: EventsGateway,
    private readonly queue: Queue,
    private readonly renderService: RenderService,
  ) {
    const configuredTimeout = this.configService.get<string>('RENDER_WAIT_TIME');

    if (configuredTimeout) {
      this.timeoutTime = parseInt(configuredTimeout);
    }
  }

  async onModuleInit() {
    if (
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<string>('NODE_ENV') === 'test'
    ) {
      return;
    }

    await this._updateStatuses();

    this.logger.debug(
      `[${this.serviceName}] Updated status to ${this.hasStarted ? 'started' : 'stopped'}`,
    );
  }

  @Cron('*/1 * * * *')
  async checkQueue() {
    if (
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<string>('NODE_ENV') === 'test'
    ) {
      return;
    }

    await this._checkAndStartStopIfNeeded();
  }

  async startServer(): Promise<void> {
    this.logger.log(`[${this.serviceName}] Starting worker for queue ${this.queue.name}`);

    const service = await this._getService();
    await this.renderService.startService(service);
    this.gateway.server.emit(EVENTS.SERVICE.SERVICE_STARTING, {
      id: service.id,
      service: this.serviceName,
    });
  }

  async stopServer(): Promise<void> {
    this.logger.log(`[${this.serviceName}] Stopping worker for queue ${this.queue.name}`);
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

  private async _updateStatuses() {
    const service = await this._getService();
    if (!service.renderId) {
      this.logger.log(`[${this.serviceName}] No render id found, skipping status update`);
      return;
    }
    const render = await this.renderService.getService(service);

    if (render.suspended === 'suspended') {
      service.status = 'stopped';
      this.gateway.server?.emit(EVENTS.SERVICE.SERVICE_STOPPED, {
        id: service.id,
        service: this.serviceName,
      });
    } else {
      service.status = 'started';
      this.hasStarted = true;
      this.startTime = new Date();

      this.gateway.server?.emit(EVENTS.SERVICE.SERVICE_STARTED, {
        id: service.id,
        service: this.serviceName,
      });
    }

    await service.save();
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

        this.logger.debug(`[${this.serviceName}] No more jobs in queue, stopping worker`);
        this.stopServer();
        this.hasStarted = false;
      }
    }
  }
}
