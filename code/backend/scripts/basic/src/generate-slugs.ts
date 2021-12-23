import {
  Club,
  DataBaseHandler,
  EventCompetition,
  EventTournament,
  logger,
  Player,
  Team,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  try {
    const player = await Player.findAll({ transaction });
    for (const p of player) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }

    logger.debug(`${player.length} players updated`);

    const clubs = await Club.findAll({ transaction });
    for (const p of clubs) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }

    logger.debug(`${clubs.length} clubs updated`);

    const comps = await EventCompetition.findAll({ transaction });
    for (const p of comps) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }

    logger.debug(`${comps.length} competitions updated`);

    const tournaments = await EventTournament.findAll({ transaction });
    for (const p of tournaments) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }

    logger.debug(`${tournaments.length} tournaments updated`);

    const teams = await Team.findAll({ transaction });
    for (const p of teams) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }

    logger.debug(`${teams.length} teams updated`);

    await transaction.commit();
  } catch (error) {
    logger.debug('something went wrong', error);
    transaction.rollback();
  }
})();
