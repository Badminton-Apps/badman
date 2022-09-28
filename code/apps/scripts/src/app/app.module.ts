import { DatabaseModule, Player } from '@badman/backend/database';
import { QueueModule, Sync, SyncQueue } from '@badman/backend/queue';
import { TwizzitModule } from '@badman/backend/twizzit';
import { VisualModule } from '@badman/backend/visual';
import { InjectQueue } from '@nestjs/bull';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Queue } from 'bull';
import { ChangedEncountersService } from './scripts';
import { SyncRankingService } from './scripts/sync-ranking/sync-ranking.service';
import * as XLSX from 'xlsx';

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

  async onModuleInit1() {
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

    this.logger.log('Done');
  }

  async onModuleInit() {
    const remaining = await this._sync.findPlayersWithNoRanking();

    const players = await Player.findAll({
      where: {
        id: remaining.map((r) => r.playerId),
      },
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      players?.map((p) => {
        const place  = remaining.find((r) => r.playerId === p.id);

        return {
          'Id': p.id,
          'Naam': p.fullName,
          'Lidnummer': p.memberId,
          "Single": place.single,
          "Double": place.double,
          "Mix": place.mix,
        };
      }),
      {
        header: ['Id', 'Naam', 'Lidnummer', 'Single', 'Double', 'Mix'],
      }
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Players');
    XLSX.writeFile(wb, 'Remaining.xlsx');
    this.logger.log('Done');
  }
}
