import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService, SequelizeHealthIndicator } from '@nestjs/terminus';

@Controller({
  path: '/health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly sequelize: SequelizeHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.sequelize.pingCheck('database')]);
  }

  @Get('ping')
  @HealthCheck()
  ping() {
    return 'pong'
  }
}
