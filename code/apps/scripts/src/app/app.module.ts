import { DatabaseModule } from '@badman/backend/database';
import { GameExportService, TwizzitModule } from '@badman/backend/twizzit';
import { VisualModule } from '@badman/backend/visual';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { writeFile } from 'fs/promises';
import { ChangedEncountersService } from './scripts';
import { WrongDatesService } from './scripts/wrong-dates/wrong-dates.service';

@Module({
  providers: [ChangedEncountersService, WrongDatesService],
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    VisualModule,
    TwizzitModule,
  ],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private _export: GameExportService) {}

  async onModuleInit() {
    this.logger.log('Running script');
    const games = await this._export.gamesExport(2022, 'cb0cfc70-d93c-4e81-92e6-07b5724d40b0');

   
  }

  
}
