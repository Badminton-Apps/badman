import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SyncRankingService } from './scripts/sync-ranking/sync-ranking.service';

@Module({
  providers: [SyncRankingService],
  imports: [ConfigModule.forRoot(), DatabaseModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private fill: SyncRankingService) {}

  async onModuleInit() {
    this.logger.log('Running script');
    const noRanking = await this.fill.findPlayersWithNoRanking();

    this.logger.log(`Found ${noRanking.length} players with no ranking`);

    for (const player of noRanking) {
      // print progress % on 2 decimals
      const index = noRanking.indexOf(player);
      const progress = Math.round((index / noRanking.length) * 10000) / 100;
      this.logger.log(`Progress: ${progress}%, ${index} / ${noRanking.length}`);

      if (!player.playerId) {
        this.logger.log(`No memberId found for player ${player.id}`);
        continue;
      }

      await this.fill.syncRanking(player.playerId);
    }
  }
}
