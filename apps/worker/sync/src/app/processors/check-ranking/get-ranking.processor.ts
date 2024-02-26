import { Player, RankingPlace, RankingSystem } from '@badman/backend-database';
import { accepCookies, getBrowser, selectBadmninton } from '@badman/backend-pupeteer';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger, NotFoundException } from '@nestjs/common';
import { Job } from 'bull';
import { Browser } from 'puppeteer';
import { getRanking, getViaRanking, searchPlayer } from './pupeteer';

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
  async syncRankingJob(job: Job<{ playerId: string }>): Promise<void> {
    this.syncRanking(job.data.playerId);
  }

  async syncRanking(playerId: string): Promise<void> {
    let browser: Browser | undefined;

    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(`${Player.name}: ${playerId} not found`);
    }

    this.logger.debug(`Syncing ranking for ${player.fullName} (${player.memberId})`);
    const primary = await RankingSystem.findOne({
      where: {
        primary: true,
      },
    });

    if (!primary) {
      throw new NotFoundException(`${RankingSystem.name}: primary not found`);
    }

    if (!player.memberId) {
      this.logger.warn(`Player ${player.fullName} has no memberId`);
      return;
    }

    // Find all rankingplaces since the last update
    const rankingPlaces = await RankingPlace.findAll({
      where: {
        systemId: primary.id,
        playerId: player.id,
      },
      order: [['rankingDate', 'DESC']],
    });

    if (rankingPlaces.length === 0) {
      this.logger.warn(`Player ${player.fullName} has no ranking`);
      return;
    }

    try {
      // Create browser
      browser = await getBrowser();

      const page = await browser.newPage();
      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      // Accept cookies
      await accepCookies({ page });
      await selectBadmninton({ page });

      // Processing player
      const result = await getViaRanking({ page }, player);

      let single: number | undefined;
      let double: number | undefined;
      let mix: number | undefined;

      if (!result) {
        // ranking was not found
        const links = await searchPlayer({ page }, player);
        if (links.length === 0) {
          this.logger.warn(`Player ${player.fullName} not found`);
          return;
        }

        // iterate over links and extract ranking
        for (const url of links) {
          await page.goto(`https://www.toernooi.nl/${url}`);
          // Get Ranking and set local variables
          try {
            // Extract ranking
            const ranking = await getRanking({ page, timeout: 200 });

            // We found our player
            if (ranking.single) {
              single = ranking.single;
            }
            if (ranking.double) {
              double = ranking.double;
            }
            if (ranking.mix) {
              mix = ranking.mix;
            }
            break;
          } catch (error) {
            continue;
          }
        }
      }

      if (!single || !double || !mix) {
        this.logger.warn(`No ranking found for ${player.fullName}`);
        return;
      }

      this.logger.debug(`Setting ranking for ${player.fullName}: ${single} ${double} ${mix}`);

      for (const rankingPlace of rankingPlaces) {
        // Update player
        rankingPlace.single = single;
        rankingPlace.double = double;
        rankingPlace.mix = mix;

        rankingPlace.changed('single', true);
        rankingPlace.changed('double', true);
        rankingPlace.changed('mix', true);

        await rankingPlace.save();

        if (rankingPlace.updatePossible) {
          break;
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Error while processing player ${player.fullName}`);
    } finally {
      // Close browser
      if (browser) {
        browser.close();
        this.logger.debug(`Syned ${player.fullName}`);
      }
    }
  }
}
