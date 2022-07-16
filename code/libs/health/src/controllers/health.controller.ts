import { Controller, Get, Logger, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  SequelizeHealthIndicator,
} from '@nestjs/terminus';

@Controller({
  path: '/health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  private logger = new Logger(HealthController.name);
  constructor(
    private health: HealthCheckService,
    private db: SequelizeHealthIndicator,
    private config: ConfigService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
