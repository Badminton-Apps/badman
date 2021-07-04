import {
  Club,
  DataBaseHandler,
  EventCompetition,
  SubEventCompetition,
  SubEventType,
  Team,
  logger,
  MailService,
  Role,
  Player
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import csvWriter from 'csv-write-stream';
import { createWriteStream, existsSync, unlinkSync } from 'fs';
import { Op } from 'sequelize';

(async () => {
  try {
    const databaseService = new DataBaseHandler(dbConfig.default);
    const file = 'out.csv';
    const YEAR = 2021;
    let writer;

    if (existsSync(file)) {
      unlinkSync(file); 
    }
    
    writer = csvWriter({
      headers: ['club', 'club_nummer',  'comments_prov', 'comments_liga', 'comments_nat']
    });
    writer.pipe(createWriteStream(file, { flags: 'a' }));

    const dbEvents = await EventCompetition.findAll({
      where: {
        startYear: YEAR
      }
    });

    const dbClubs = await Club.findAll({
      include: [
        {
          attributes: ['id'],
          model: Team,
          where: {
            active: true
          },
          include: [
            {
              model: SubEventCompetition,
              attributes: [],
              required: true,
              where: {
                eventId: {
                  [Op.in]: dbEvents.map(r => r.id)
                }
              }
            }
          ]
        }
      ]
    });

    logger.debug(`Found ${dbClubs.length} clubs`);

    const ligaEvent = dbEvents.find(
      r => r.name == 'Vlaamse interclubcompetitie 2021-2022'
    );
    const natEvent = dbEvents.find(r => r.name == '	Victor League 2021-2022');

    for (const club of dbClubs) {
      const commentsClub = await club.getComments();
      const prov = commentsClub?.find(
        c => c.linkId !== ligaEvent?.id && c.linkId !== natEvent?.id
      );
      const liga = commentsClub?.find(c => c.linkId === ligaEvent?.id);
      const nat = commentsClub?.find(c => c.linkId === natEvent?.id);

      writer.write({
        club: club.name,
        club_nummer: club.clubId,
        comments_prov: prov?.message,
        comments_liga: liga?.message,
        comments_nat: nat?.message
      });

      logger.debug('Club', {
        club: club.name,
        club_nummer: club.clubId,
        comments_prov: prov?.message,
        comments_liga: liga?.message,
        comments_nat: nat?.message
      })
    }

    writer.end();

    return;
  } catch (e) {
    logger.error('Something went wrong', e);
  }
})();
