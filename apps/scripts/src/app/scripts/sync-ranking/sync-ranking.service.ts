import { Player, RankingPlace, RankingSystem } from '@badman/backend-database';
import {
  getBrowser,
  accepCookies,
  selectBadmninton,
} from '@badman/backend-pupeteer';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Browser } from 'puppeteer';
import { Op } from 'sequelize';
import { getViaRanking, searchPlayer, getRanking } from './pupeteer';

@Injectable()
export class SyncRankingService {
  private readonly logger = new Logger(SyncRankingService.name);

  async findPlayersWithNoRanking() {
    const rankings = await RankingPlace.findAll({
      where: {
        [Op.or]: [
          {
            single: null,
          },
          {
            double: null,
          },
          {
            mix: null,
          },
        ],
        rankingDate: '2022-09-05T00:00:00.000Z',
      },
    });

    this.logger.log(`Found ${rankings.length} players with no ranking`);

    // return last 10
    return rankings;
  }

  async syncRanking(playerId: string): Promise<void> {
    let browser: Browser | undefined

    const player = await Player.findByPk(playerId);

    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
      return;
    }

    this.logger.log(
      `Syncing ranking for ${player.fullName} (${player.memberId})`
    );
    const primary = await RankingSystem.findOne({
      where: {
        primary: true,
      },
    });

    if (!primary) {
      throw new NotFoundException('No primary ranking system found');
    }

    if (!player.memberId) {
      this.logger.log(`Player ${player.fullName} has no memberId`);
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
      this.logger.log(`Player ${player.fullName} has no ranking`);
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
          this.logger.log(`Player ${player.fullName} not found`);
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
        this.logger.log(`No ranking found for ${player.fullName}`);
        return;
      }

      this.logger.log(
        `Setting ranking for ${player.fullName}: ${single} ${double} ${mix}`
      );

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
        this.logger.log(`Syned ${player.fullName}`);
      }
    }
  }
}
