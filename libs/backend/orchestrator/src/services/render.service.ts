import { Service } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
type ServiceStatus = 'suspended' | 'not_suspended';

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

  async startService(service: Service) {
    service.status = 'starting';
    await service.save();

    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this._logger.debug(
        `Skipping startService for ${service.name} in development`,
      );

      return;
    }

    if (!service.renderId) {
      throw new Error(`No render id found for service ${service.name}`);
    }

    const serviceData = await this._getSerivce(service);

    if (serviceData.suspended == 'suspended') {
      try {
        this._logger.debug(
          `Starting service ${service.name} with id ${service.renderId}`,
        );
        await fetch(`${this.renderApi}/services/${service.renderId}/resume`, {
          method: 'POST',
          headers: this.headers,
        });
        this._logger.log(`Service ${service.name} started`);
      } catch (err: unknown) {
        this._logger.error(`Service ${service.name} failed to start`, err);
      }
    } else {
      this._logger.debug(`Service ${service.name} already started`);
    }
  }

  async suspendService(service: Service) {
    service.status = 'stopped';
    await service.save();

    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this._logger.debug(
        `Skipping suspendService for ${service.name} in development`,
      );
      return;
    }
    if (!service.renderId) {
      throw new Error(`No render id found for service ${service.name}`);
    }

    const serviceData = await this._getSerivce(service);

    this._logger.debug(
      `Service ${service.name} status: ${serviceData.suspended}`,
    );
    if (serviceData.suspended == 'not_suspended') {
      try {
        this._logger.debug(
          `Suspending service ${service.name} with id ${service.renderId}`,
        );
        await fetch(`${this.renderApi}/services/${service.renderId}/suspend`, {
          method: 'POST',
          headers: this.headers,
        });
        this._logger.log(`Service ${service.name} suspended`);
      } catch (err: unknown) {
        this._logger.error(`Service ${service.name} failed to suspend`, err);
      }
    } else {
      this._logger.debug(`Service ${service.name} already suspended`);
    }
  }

  private async _getSerivce(service: Service) {
    const renderService = await fetch(
      `${this.renderApi}/services/${service.renderId}`,
      {
        method: 'GET',
        headers: this.headers,
      },
    );

    if (!renderService.ok) {
      throw new Error(
        `Error getting service ${
          service.renderId
        }: ${await renderService.text()}`,
      );
    }

    const serviceData = (await renderService.json()) as {
      suspended: ServiceStatus;
    };

    // update service status
    service.status =
      serviceData.suspended == 'suspended' ? 'stopped' : 'started';
    await service.save();

    return serviceData;
  }
}
