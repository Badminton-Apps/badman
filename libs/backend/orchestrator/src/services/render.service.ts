import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import api from 'api';

@Injectable()
export class RenderService {
  private renderApi = api('@render-api/v1.0');
  private _logger = new Logger(RenderService.name);

  constructor(private readonly configService: ConfigService) {
    this.renderApi.auth(this.configService.get<string>('RENDER_API_KEY'));
  }

  async startService(serviceName: 'simulation' | 'sync') {
    let serviceId: string | undefined;

    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this._logger.debug(`Skipping startService for ${serviceName} in development`);
      return;
    }

    switch (serviceName) {
      case 'simulation':
        serviceId = this.configService.get('SERVICE_SYNC');
        break;
      case 'sync':
        serviceId = this.configService.get('SERVICE_SYNC');
        break;
      default:
        throw new Error(`Service ${serviceName} not found`);
    }

    if (!serviceId) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const service = await this.renderApi.getService({ serviceId });
    this._logger.debug(`Service ${serviceName} status: ${service.data.suspended}`);
    if (service.data.suspended == 'suspened') {
      try {
        this._logger.debug(
          `Starting service ${serviceName} with id ${serviceId}`,
        );
        await this.renderApi.resumeService({ serviceId });
        this._logger.log(`Service ${serviceName} started`);
      } catch (err: unknown) {
        this._logger.error(`Service ${serviceName} failed to start`, err);
      }
    } else {
      this._logger.debug(`Service ${serviceName} already started`);
    }
  }

  async suspendService(serviceName: 'simulation' | 'sync') {
    let serviceId: string | undefined;
    switch (serviceName) {
      case 'simulation':
        serviceId = this.configService.get('SERVICE_RANKING');
        break;
      case 'sync':
        serviceId = this.configService.get('SERVICE_SYNC');
        break;
      default:
        throw new Error(`Service ${serviceName} not found`);
    }

    if (!serviceId) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const service = await this.renderApi.getService({ serviceId });
    this._logger.debug(`Service ${serviceName} status: ${service.data.suspended}`);
    if (service.data.suspended == 'not_suspended') {
      try {
        this._logger.debug(
          `Suspending service ${serviceName} with id ${serviceId}`,
        );
        await this.renderApi.suspendService({ serviceId });
        this._logger.log(`Service ${serviceName} suspended`);
      } catch (err: unknown) {
        this._logger.error(`Service ${serviceName} failed to suspend`, err);
      }
    } else {
      this._logger.debug(`Service ${serviceName} already suspended`);
    }
  }
}
