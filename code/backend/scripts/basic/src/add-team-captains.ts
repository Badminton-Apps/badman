import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import {
  Claim,
  Club,
  DataBaseHandler,
  logger,
  Player,
  Role,
  Team
} from '../../../packages/_shared';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  try {
    const daClaim = await Claim.findByPk(
      '58e44e85-6439-429c-b71b-7cc1ec326871'
    );

    const clubs = await Club.findAll({
      include: [
        {
          model: Team,
          where: { active: true },
          include: [{ model: Player, as: 'captain' }]
        },
        { model: Role, include: [{ model: Claim }] }
      ]
    });

    for (const club of clubs) {
      logger.debug(`Club ${club.name} started`);
      
      if (club.roles.length > 1) {
        logger.warn(`Club ${club.name} has more than one role`);
        continue;
      }
      const adminRole = club.roles.find(r => r.name === 'Admin');
      await adminRole.addClaim(daClaim.id, {
        transaction,
        ignoreDuplicates: true
      });

      const captainRole = new Role({ name: 'Team captains', clubId: club.id });
      await captainRole.save({ transaction });
      await captainRole.addClaim(daClaim.id, {
        transaction,
        ignoreDuplicates: true
      });

      const captains = club.teams.map(t => t?.captain?.id).filter(r => !!r);
      await captainRole.addPlayers(captains, { transaction, ignoreDuplicates: true });


      logger.debug(`Club ${club.name} finished`);
    }

    await transaction.commit();
  } catch (error) {
    logger.debug('something went wrong', error);
    transaction.rollback();
  }
})();
