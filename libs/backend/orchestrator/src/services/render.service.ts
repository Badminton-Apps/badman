import { Service } from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
type ServiceStatus = "suspended" | "not_suspended";
import { ConfigType } from "@badman/utils";

@Injectable()
export class RenderService {
  private _logger = new Logger(RenderService.name);
  private headers!: {
    accept: string;
    authorization: string;
  };
  private renderApi!: string;

  constructor(private readonly configService: ConfigService<ConfigType>) {
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    if (nodeEnv === "development" || nodeEnv === "test") {
      this._logger.verbose(
        `Render API disabled in ${nodeEnv} (start/suspend/status will be no-ops)`
      );
    } else {
      const api = this.configService.get<string>("RENDER_API_URL");
      const apiKey = this.configService.get<string>("RENDER_API_KEY");
      if (!api) {
        this._logger.warn("RENDER_API_URL is not set; Render API calls will fail");
        throw new Error("RENDER_API_URL is not defined");
      }
      if (!apiKey) {
        this._logger.warn("RENDER_API_KEY is not set; Render API calls may be rejected");
      }
      this.headers = {
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
      };
      this.renderApi = api;
      this._logger.debug(`Render API configured (base URL: ${api})`);
    }
  }

  async startService(service: Service) {
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    if (nodeEnv === "development" || nodeEnv === "test") {
      this._logger.verbose(`Skipping startService for ${service.name} in ${nodeEnv}`);
      return;
    }

    if (!service.renderId) {
      this._logger.error(
        `startService: No renderId on service "${service.name}" (id=${service.id}). ` +
          "Set the Render.com service ID on this record (Dashboard → service → ID in URL or API)."
      );
      throw new Error(`No render id found for service ${service.name}`);
    }

    this._logger.debug(`startService: fetching status for ${service.name} (renderId=${service.renderId})`);
    const serviceData = await this.getService(service, false);

    // Start the service if it's suspended
    if (serviceData.suspended == "suspended") {
      try {
        await fetch(`${this.renderApi}/services/${service.renderId}/resume`, {
          method: "POST",
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
    service.status = "starting";
    await service.save();
  }

  async suspendService(service: Service) {
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    if (nodeEnv === "development" || nodeEnv === "test") {
      this._logger.verbose(`Skipping suspendService for ${service.name} in ${nodeEnv}`);
      return;
    }
    if (!service.renderId) {
      this._logger.error(
        `suspendService: No renderId on service "${service.name}" (id=${service.id}).`
      );
      throw new Error(`No render id found for service ${service.name}`);
    }

    this._logger.debug(`suspendService: fetching status for ${service.name} (renderId=${service.renderId})`);
    const serviceData = await this.getService(service, false);

    // Suspend the service if it's not suspended
    if (serviceData.suspended == "not_suspended") {
      try {
        await fetch(`${this.renderApi}/services/${service.renderId}/suspend`, {
          method: "POST",
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
    service.status = "stopped";
    await service.save();
  }

  public async getService(service: Service, setStatus = true) {
    if (!service.renderId) {
      this._logger.error(`getService: service "${service.name}" (id=${service.id}) has no renderId`);
      throw new Error(`No render id found for service ${service.name}`);
    }
    this._logger.verbose(`getService: GET ${this.renderApi}/services/${service.renderId}`);
    const renderService = await fetch(`${this.renderApi}/services/${service.renderId}`, {
      method: "GET",
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
      service.status = serviceData.suspended == "suspended" ? "stopped" : "started";
      await service.save();
    }

    return serviceData;
  }
}
