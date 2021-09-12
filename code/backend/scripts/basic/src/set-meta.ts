import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import moment from 'moment';
import { Op, where } from 'sequelize';
import {
  Club,
  DataBaseHandler,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  logger,
  Player,
  SubEventCompetition,
  Team,
  TeamSubEventMembership
} from '../../../packages/_shared';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  const databaseService = new DataBaseHandler(dbConfig.default);

  const teams = await Team.findAll({
    where: {
      active: true
    },
    include: [
      {
        model: EncounterCompetition,
        as: 'homeEncounters',
        limit: 1,
        where: {
          date: {
            [Op.gte]: moment('2021-09-01').toDate()
          }
        },
        include: [
          {
            model: DrawCompetition,
            attributes: ['subeventId'],
            required: true
          }
        ]
      },
      {
        model: SubEventCompetition,
        attributes: ['id', 'name'],
        required: true,
        include: [
          {
            required: true,
            model: EventCompetition,
            where: {
              startYear: 2021
            },
            attributes: ['id', 'name']
          }
        ]
      }
    ]
  });

  for (const team of teams) {
    const correctSubEvent = team.homeEncounters[0].draw?.subeventId;

    if (
      !team.subEvents
        ?.map(r => r.id)
        .includes(team.homeEncounters[0].draw?.subeventId) ||
      team.subEvents.length > 1
    ) {
      await TeamSubEventMembership.destroy({
        where: {
          teamId: team.id,
          subEventId: {
            [Op.in]: team.subEvents.map(r => r.id)
          }
        }
      });

      await new TeamSubEventMembership({
        teamId: team.id,
        subEventId: correctSubEvent
      }).save();
    }
  }

  const clubs = await Club.findAll({
    attributes: ['id'],
    include: [
      {
        model: Team,
        required: true,
        attributes: [],
        where: { active: true },
        include: [
          {
            model: SubEventCompetition,
            required: true,
            attributes: [],
            include: [
              {
                model: EventCompetition,
                required: true,
                where: {
                  startYear: 2021
                }
              }
            ]
          }
        ]
      }
    ]
  });

  for (const club of clubs) {
    await databaseService.addMetaForEnrollment(club.id, 2021);
  }
}
