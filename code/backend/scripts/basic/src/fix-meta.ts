import {
  DataBaseHandler,
  EventEntry,
  logger,
  Player,
  Team,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { Op } from 'sequelize';
import { Client } from 'pg';

const OLD_DATABASE = process.env.OLD_DATABASE || 'ranking_old';
const HOST = process.env.OLD_DB_HOST || '127.0.0.1';
const PORT = process.env.OLD_DB_PORT || '5433';
const USERNAME = process.env.OLD_DB_USER || 'ranking';
const PASSWORD = process.env.OLD_DB_PASSWORD || 'ranking-pass';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  logger.debug('Connecting to old database', {
    data: {
      host: HOST,
      port: parseInt(PORT, 10),
      database: OLD_DATABASE,
      user: USERNAME,
      password: PASSWORD,
    },
  });

  const oldDb = new Client({
    host: HOST,
    port: parseInt(PORT, 10),
    database: OLD_DATABASE,
    user: USERNAME,
    password: PASSWORD,
  });
  await oldDb.connect();

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();
  try {
    const entries = await EventEntry.findAll({
      where: {
        meta: {
          [Op.ne]: null,
        },
        entryType: 'competition',
      },
      include: [
        {
          model: Team,
          attributes: ['id', 'name'],
        },
      ],
      transaction,
    });
    logger.debug(`Found ${entries.length} entries`);

    // Sort entries by name
    entries.sort((a, b) => {
      return a.team.name.localeCompare(b.team.name);
    });

    for (const entry of entries) {
      let updateHappend = false;

      for (const player of entry.meta?.competition?.players) {
        const p = await Player.findByPk(player.id, { transaction });
        if (!p) {
          const res = await oldDb.query(
            `SELECT "memberId" from "Players" where id = '${player.id}'`
          );

          if (res.rowCount === 0) {
            logger.error(`Player ${player.id} not found in old database`);
          } else {
            const olddbPlayer = res.rows[0];
            if (res.rowCount > 1) {
              logger.error(
                `Multiple players with id ${player.id} found in old database`
              );
            }

            const updatedPlayer = await Player.findOne({
              where: {
                memberId: olddbPlayer.memberId,
              },
              transaction,
            });

            if (updatedPlayer) {
              updateHappend = true;

              // Change player id in meta
              entry.meta.competition.players =
                entry.meta.competition.players.map((p) => {
                  if (p.id === player.id) {
                    p.id = updatedPlayer.id;
                  }
                  return p;
                });
            } else {
              logger.error(
                `Player with member id ${olddbPlayer.memberId} not found in new database`
              );
            }
          }
        }
      }
      if (updateHappend) {
        logger.debug(`Team ${entry.team.name} updated`);
        // update meta
        await EventEntry.update(
          { meta: JSON.stringify(entry.meta) },
          {
            where: {
              id: entry.id,
            },
            transaction,
          }
        );
      } else {
        logger.debug(`Team ${entry.team.name} not updated`);
      }
    }

    await transaction.commit();
    await oldDb.end();
    logger.debug('Finished');
  } catch (error) {
    logger.error('something went wrong', error);
    await transaction.rollback();
  }
})();
