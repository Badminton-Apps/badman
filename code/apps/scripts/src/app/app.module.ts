import { DatabaseModule } from '@badman/backend/database';
import { QueueModule, Sync, SyncQueue } from '@badman/backend/queue';
import { TwizzitModule } from '@badman/backend/twizzit';
import { VisualModule } from '@badman/backend/visual';
import { InjectQueue } from '@nestjs/bull';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Queue } from 'bull';
import { ChangedEncountersService } from './scripts';
import { SyncRankingService } from './scripts/sync-ranking/sync-ranking.service';

@Module({
  providers: [ChangedEncountersService, SyncRankingService],
  imports: [
    ConfigModule.forRoot(),
    QueueModule,
    DatabaseModule,
    VisualModule,
    TwizzitModule,
  ],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(
    private _sync: SyncRankingService,
    @InjectQueue(SyncQueue) private rankingSync: Queue
  ) {}

  async onModuleInit() {
    this.logger.log('Running script');
    const todo = await this._sync.findPlayersWithNoRanking();

    for (const place of todo) { 
      this.logger.log(`Player ${place.playerId}`);
      this.rankingSync.add(
        Sync.CheckRanking,
        {
          playerId: place.playerId,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    }
  }
}
