import { Service } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
type ServiceStatus = 'suspended' | 'not_suspended';
import { ConfigType } from '@badman/utils';

@Injectable()
export class RenderService {
  private _logger = new Logger(RenderService.name);
  private headers!: {
    accept: string;
    authorization: string;
  };
  private renderApi!: string;

  constructor(private readonly configService: ConfigService<ConfigType>) {
    if (
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<string>('NODE_ENV') === 'test'
    ) {
      this._logger.verbose(`Skipping startService for ${RenderService.name} in development`);
    } else {
      this.headers = {
        accept: 'application/json',
        authorization: `Bearer ${this.configService.get<string>('RENDER_API_KEY')}`,
      };

      const api = this.configService.get<string>('RENDER_API_URL');

      if (!api) {
        throw new Error('RENDER_API_URL is not defined');
      }

      this.renderApi = api;
    }
  }

  async startService(service: Service) {
    // Don't start services in development
    if (
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<string>('NODE_ENV') === 'test'
    ) {
      this._logger.verbose(`Skipping startService for ${service.name} in development`);
      return;
    }

    if (!service.renderId) {
      throw new Error(`No render id found for service ${service.name}`);
    }

    // Get the service
    const serviceData = await this.getService(service, false);

    // Start the service if it's suspended
    if (serviceData.suspended == 'suspended') {
      try {
        await fetch(`${this.renderApi}/services/${service.renderId}/resume`, {
          method: 'POST',
          headers: this.headers,
        });
        this._logger.log(`Service ${service.name} (${service.renderId}) resumed`);
      } catch (err: unknown) {
        this._logger.error(`Service ${service.name} failed to start`, err);
      }
    } else {
      this._logger.debug(`Service ${service.name} already started`);
    }

    // Update service status
    service.status = 'starting';
    await service.save();
  }

  async suspendService(service: Service) {
    // Don't suspend services in development
    if (
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<string>('NODE_ENV') === 'test'
    ) {
      this._logger.verbose(`Skipping suspendService for ${service.name} in development`);
      return;
    }
    if (!service.renderId) {
      throw new Error(`No render id found for service ${service.name}`);
    }

    // Get the service
    const serviceData = await this.getService(service, false);

    // Suspend the service if it's not suspended
    if (serviceData.suspended == 'not_suspended') {
      try {
        await fetch(`${this.renderApi}/services/${service.renderId}/suspend`, {
          method: 'POST',
          headers: this.headers,
        });
        this._logger.log(`Service ${service.name} (${service.renderId}) suspended`);
      } catch (err: unknown) {
        this._logger.error(`Service ${service.name} failed to suspend`, err);
      }
    } else {
      this._logger.debug(`Service ${service.name} already suspended`);
    }

    // Update service status
    service.status = 'stopped';
    await service.save();
  }

  public async getService(service: Service, setStatus = true) {
    const renderService = await fetch(`${this.renderApi}/services/${service.renderId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!renderService.ok) {
      throw new Error(`Error getting service ${service.renderId}: ${await renderService.text()}`);
    }

    const serviceData = (await renderService.json()) as {
      suspended: ServiceStatus;
    };

    if (setStatus) {
      // update service status
      service.status = serviceData.suspended == 'suspended' ? 'stopped' : 'started';
      await service.save();
    }

    return serviceData;
  }
}
