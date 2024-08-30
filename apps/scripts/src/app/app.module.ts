import { DatabaseModule } from '@badman/backend-database';
import { VisualModule } from '@badman/backend-visual';
import { configSchema, load } from '@badman/utils';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WrongDatesService } from './scripts/wrong-dates/wrong-dates.service';

@Module({
  providers: [WrongDatesService],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [load],
    }),
    DatabaseModule,
    VisualModule,
  ],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);

  constructor(private fixer: WrongDatesService) {}

  async onModuleInit() {
    this.logger.log('Running script');

    await this.fixer.fixWrongDates(2024); 

    this.logger.log('Script finished');
  }
}
