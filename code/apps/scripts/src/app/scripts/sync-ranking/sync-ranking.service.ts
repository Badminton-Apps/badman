import { RankingPlace } from '@badman/backend/database';
import { Injectable, Logger } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';

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
        rankingDate: '2022-08-29T00:00:00.000Z',
      },
    });

    this.logger.log(`Found ${rankings.length} players with no ranking`);

    // return last 10
    return rankings.slice(0, 100);
  }
}
