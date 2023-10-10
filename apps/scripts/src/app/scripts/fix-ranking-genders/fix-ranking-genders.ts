import {
  Player,
  RankingLastPlace,
  RankingPlace,
} from '@badman/backend-database';
import { Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

export class FixGendersRunner {
  private readonly logger = new Logger(FixGendersRunner.name);
  constructor(private _sequelize: Sequelize) {}

  async process() {
    const transaction = await this._sequelize.transaction();

    try {
      this.logger.verbose(`Fixing LastPlaces`);

      const lastplaces = await RankingLastPlace.findAll({
        attributes: ['id'],
        include: [{ model: Player, attributes: ['id', 'gender'] }],
        where: {
          gender: null,
        },
        transaction,
      }); 

      // corret gender for incorrect places
      for (const place of lastplaces) {
        place.gender = place.player?.gender;
        await place.save({ transaction, hooks: false });
      }

      this.logger.verbose(`Fixing Places`);
      const places = await RankingPlace.findAll({
        attributes: ['id'],
        include: [{ model: Player, attributes: ['id', 'gender'] }],
        where: {
          gender: null,
        },
        transaction,
      });

      // corret gender for incorrect places
      for (const place of places) {
        place.gender = place.player?.gender;
        await place.save({ transaction, hooks: false });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
