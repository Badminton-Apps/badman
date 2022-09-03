import { DatabaseModule } from '@badman/backend/database';
import { VisualModule } from '@badman/backend/visual';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChangedEncountersService } from './scripts';
import { ResyncBaseTeamsService } from './scripts/resync-base-teams/resync-base-teams.service';
import { WrongDatesService } from './scripts/wrong-dates/wrong-dates.service';

@Module({
  providers: [
    ChangedEncountersService,
    WrongDatesService,
    ResyncBaseTeamsService,
  ],
  imports: [ConfigModule.forRoot(), DatabaseModule, VisualModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private _changed: ResyncBaseTeamsService) {}

  async onModuleInit() {
    this.logger.log('Running script');
    await this._changed.resyncBaseTeams();
  }
}
