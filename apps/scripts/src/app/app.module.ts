import { DatabaseModule } from '@badman/backend-database';
import { configSchema, load } from '@badman/utils';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssignClubToPlayers } from './scripts/assign-clubs-to-players-group-role/service';

@Module({
  providers: [AssignClubToPlayers],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [load],
    }),
    DatabaseModule,
  ],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);

  constructor(private fixer: AssignClubToPlayers) {}

  async onModuleInit() {
    this.logger.log('Running script');

    await this.fixer.process();

    this.logger.log('Script finished');
  }
}
