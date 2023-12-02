import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RenderService {
  private _logger = new Logger(RenderService.name);
  private headers!: {
    accept: string;
    authorization: string;
  };
  private renderApi!: string;

  constructor(private readonly configService: ConfigService) {
    this.headers = {
      accept: 'application/json',
      authorization: `Bearer ${this.configService.get<string>(
        'RENDER_API_KEY',
      )}`,
    };
    this.renderApi = this.configService.get<string>('RENDER_API_URL')!;
  }

  async startService(serviceName: 'simulation' | 'sync') {
    let serviceId: string | undefined;

    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this._logger.debug(
        `Skipping startService for ${serviceName} in development`,
      );
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

    const serviceData = await this._getSerivce(serviceId, serviceName);

    if (serviceData.suspended == 'suspended') {
      try {
        this._logger.debug(
          `Starting service ${serviceName} with id ${serviceId}`,
        );
        await fetch(`${this.renderApi}/services/${serviceId}/resume`, {
          method: 'POST',
          headers: this.headers,
        });
        this._logger.log(`Service ${serviceName} started`);
      } catch (err: unknown) {
        this._logger.error(`Service ${serviceName} failed to start`, err);
      }
    } else {
      this._logger.debug(`Service ${serviceName} already started`);
    }
  }

  async suspendService(serviceName: 'simulation' | 'sync') {
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this._logger.debug(
        `Skipping suspendService for ${serviceName} in development`,
      );
      return;
    }

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

    const serviceData = await this._getSerivce(serviceId, serviceName);

    this._logger.debug(
      `Service ${serviceName} status: ${serviceData.suspended}`,
    );
    if (serviceData.suspended == 'not_suspended') {
      try {
        this._logger.debug(
          `Suspending service ${serviceName} with id ${serviceId}`,
        );
        await fetch(`${this.renderApi}/services/${serviceId}/suspend`, {
          method: 'POST',
          headers: this.headers,
        });
        this._logger.log(`Service ${serviceName} suspended`);
      } catch (err: unknown) {
        this._logger.error(`Service ${serviceName} failed to suspend`, err);
      }
    } else {
      this._logger.debug(`Service ${serviceName} already suspended`);
    }
  }

  private async _getSerivce(serviceId: string, serviceName: string) {
    const service = await fetch(`${this.renderApi}/services/${serviceId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!service.ok) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const serviceData = await service.json();
    return serviceData;
  }
}
