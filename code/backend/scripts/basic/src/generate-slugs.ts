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
    logger.info(`Started`);
   
    /**
     * Generate player slugs
     */
    const player = await Player.findAll({ transaction });
    logger.debug(`${player.length} players found`);
    for (const p of player) {
      if (player.indexOf(p) % 500 === 0) {      
        logger.debug(`${player.indexOf(p)} / ${player.length}`);
      }
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }
    logger.debug(`${player.length} players updated`);

    /**
     * Generate club slugs
     */
    const clubs = await Club.findAll({ transaction });
    logger.debug(`${clubs.length} clubs found`);
    for (const p of clubs) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }
    logger.debug(`${clubs.length} clubs updated`);

    /**
     * Generate competition slugs
     */
    const comps = await EventCompetition.findAll({ transaction });
    logger.debug(`${comps.length} competitions found`);
    for (const p of comps) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }
    logger.debug(`${comps.length} competitions updated`);


    /**
     * Generate tournament slugs
     */
    const tournaments = await EventTournament.findAll({ transaction });
    logger.debug(`${tournaments.length} tournaments found`);
    for (const p of tournaments) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }
    logger.debug(`${tournaments.length} tournaments updated`);


    /**
     * Generate team slugs
     */
    const teams = await Team.findAll({ transaction });
    logger.debug(`${teams.length} teams found`);
    for (const p of teams) {
      await p.regenerateSlug(transaction);
      await p.save({ transaction });
    }
    logger.debug(`${teams.length} teams updated`);

    await transaction.commit();
    logger.info(`Finished`);
  } catch (error) {
    logger.error('something went wrong', error);
    transaction.rollback();
  }
})();
