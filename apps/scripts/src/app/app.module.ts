import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnableNotificationsService } from './scripts/enable-notifications/enable-notifications';

@Module({
  providers: [EnableNotificationsService],
  imports: [ConfigModule.forRoot(), DatabaseModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  
  constructor(private fixer: EnableNotificationsService) {}

  async onModuleInit() {
    this.logger.log('Running script');

    await this.fixer.process(2023);

    this.logger.log('Script finished');
  }
}
