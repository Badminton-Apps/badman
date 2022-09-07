import { Player, RankingPlace, RankingSystem } from '@badman/backend/database';
import { accepCookies, getBrowser } from '@badman/backend/pupeteer';
import { Sync, SyncQueue } from '@badman/backend/queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Browser, launch } from 'puppeteer';
import { getRanking, searchPlayer } from './pupeteer';

@Processor({
  name: SyncQueue,
})
export class CheckRankingProcessor {
  private readonly logger = new Logger(CheckRankingProcessor.name);

  constructor() {
    this.logger.debug('Check ranking initialized');
  }

  @Process({
    name: Sync.CheckRanking,
    concurrency: 1,
  })
  async syncEncounters(job: Job<{ playerId: string }>): Promise<void> {
    let browser: Browser;

    const player = await Player.findByPk(job.data.playerId);
    this.logger.log(
      `Syncing ranking for ${player.fullName} (${player.memberId})`
    );
    const primary = await RankingSystem.findOne({
      where: {
        primary: true,
      },
    });

    if (!player.memberId) {
      this.logger.log(`Player ${player.fullName} has no memberId`);
      return;
    }

    const places = await player.getRankingPlaces({
      where: {
        systemId: primary.id,
      },
      limit: 1,
      order: [['rankingDate', 'DESC']],
    });

    if (places.length === 0) {
      this.logger.log(`Player ${player.fullName} has no ranking`);
      return;
    }

    try {
      const place = places[0];

      // Create browser
      browser = await getBrowser();

      const page = await browser.newPage();
      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      // Accept cookies
      await accepCookies({ page });

      // Processing player
      await searchPlayer({ page }, player);

      // Get Ranking
      const { single, double, mix } = await getRanking({ page });

      // Update player
      place.single = single;
      place.double = double;
      place.mix = mix;
      await place.save();
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Error while processing player ${player.id}`);
    } finally {
      // Close browser
      if (browser) {
        browser.close();
        this.logger.log('Syned');
      }
    }
  }
}
