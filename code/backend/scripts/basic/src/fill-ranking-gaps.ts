import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import {
  Claim,
  Club,
  DataBaseHandler,
  LastRankingPlace,
  logger,
  Player,
  RankingPlace,
  RankingSystem,
  Role,
  Team
} from '@badvlasim/shared';
import { Op } from 'sequelize';
import moment from 'moment';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  try {
    const system = await RankingSystem.findOne({
      where: {
        primary: true
      },
      transaction
    });

    if (!system) {
      throw new Error('No primary ranking system found');
    }

    const players = await Player.findAll({
      include: [
        {
          model: RankingPlace,
          where: {
            SystemId: system.id
          }
        },
        {
          model: LastRankingPlace,
          where: {
            systemId: system.id
          }
        }
      ],
      order: [
        [{ model: RankingPlace, as: 'rankingPlaces' }, 'rankingDate', 'DESC']
      ]
    });

    for (const player of players) {
      for (const place of player.rankingPlaces) {
        if (place.single == null) {
          const singlePlace = player.rankingPlaces.find(
            p =>
              p.single !== null &&
              moment(p.rankingDate).isBefore(place.rankingDate)
          );
          place.single = singlePlace?.single;
          place.singlePoints = singlePlace?.singlePoints;
          place.singlePointsDowngrade = singlePlace?.singlePointsDowngrade;
        }

        if (place.double == null) {
          const doublePlace = player.rankingPlaces.find(
            p =>
              p.double !== null &&
              moment(p.rankingDate).isBefore(place.rankingDate)
          );
          place.double = doublePlace?.double;
          place.doublePoints = doublePlace?.doublePoints;
          place.doublePointsDowngrade = doublePlace?.doublePointsDowngrade;
        }

        if (place.mix == null) {
          const mixPlace = player.rankingPlaces.find(
            p =>
              p.mix !== null &&
              moment(p.rankingDate).isBefore(place.rankingDate)
          );
          place.mix = mixPlace?.mix;
          place.mixPoints = mixPlace?.mixPoints;
          place.mixPointsDowngrade = mixPlace?.mixPointsDowngrade;
        }

        await place.save({ transaction });
      }

      if (player.lastRankingPlace) {
        var lastPlace = null;
        if (
          player.lastRankingPlace.single == null ||
          player.lastRankingPlace.double == null ||
          player.lastRankingPlace.mix == null
        ) {
          lastPlace = player.rankingPlaces[0];
        }

        if (player.lastRankingPlace.single == null) {
          player.lastRankingPlace.single = lastPlace?.single;
          player.lastRankingPlace.singlePoints = lastPlace?.singlePoints;
          player.lastRankingPlace.singlePointsDowngrade =
            lastPlace?.singlePointsDowngrade;
        }
        if (player.lastRankingPlace.double == null) {
          player.lastRankingPlace.double = lastPlace?.double;
          player.lastRankingPlace.doublePoints = lastPlace?.doublePoints;
          player.lastRankingPlace.doublePointsDowngrade =
            lastPlace?.doublePointsDowngrade;
        }
        if (player.lastRankingPlace.mix == null) {
          player.lastRankingPlace.mix = lastPlace?.mix;
          player.lastRankingPlace.mixPoints = lastPlace?.mixPoints;
          player.lastRankingPlace.mixPointsDowngrade =
            lastPlace?.mixPointsDowngrade;
        }
        await player.lastRankingPlace.save({ transaction });
      } 
    }

    await transaction.commit();
  } catch (error) {
    logger.debug('something went wrong', error);
    transaction.rollback();
  }
})();
