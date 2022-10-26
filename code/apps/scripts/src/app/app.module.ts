import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FillNotification } from './scripts/fill-notification-settings/wrong-dates.service';

@Module({
  providers: [FillNotification],
  imports: [ConfigModule.forRoot(), DatabaseModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private fill: FillNotification) {}

  async onModuleInit() {
    this.logger.log('Running script');
    await this.fill.fixSettings();
  }
}
