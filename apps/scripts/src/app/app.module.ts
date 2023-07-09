import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreateLocationAvailibiltyRunner } from './scripts/location-availibilty/location-availibilty';

@Module({
  providers: [CreateLocationAvailibiltyRunner],
  imports: [ConfigModule.forRoot(), DatabaseModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private service: CreateLocationAvailibiltyRunner) {}

  async onModuleInit() {
    this.logger.log('Running script');
    await this.service.process();
  }
}
