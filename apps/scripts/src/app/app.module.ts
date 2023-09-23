import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssignClubToPlayers } from './scripts/assign-clubs-to-players/assign-clubs-to-players';

@Module({
  providers: [AssignClubToPlayers],
  imports: [ConfigModule.forRoot(), DatabaseModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  
  constructor(private fixer: AssignClubToPlayers) {}

  async onModuleInit() {
    this.logger.log('Running script');

    await this.fixer.process(2023);

    this.logger.log('Script finished');
  }
}
