import {
  DataBaseHandler,
  EventTournament,
  GroupSubEvents,
  logger,
  SubEventTournament
} from '@badvlasim/shared';
import { GraphQLInt } from 'graphql';
import { ApiError } from '../../models/api.error';
import { EventTournamentInputType, EventTournamentType } from '../types';

const addEventTournamentMutation = {
  type: EventTournamentType,
  args: {
    eventTournament: {
      name: 'EventTournament',
      type: EventTournamentInputType
    }
  },
  resolve: async (findOptions, { eventTournament }, context) => {
    if (!context.req.user.hasAnyPermission(['add:eventTournament'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const eventTournamentDb = await EventTournament.create(eventTournament, { transaction });
      const subEventTournaments = eventTournament.subEventTournaments.map(subEventTournament => {
        const { groups, ...sub } = subEventTournament;

        return {
          subEventTournamentGroup: { internalId: sub.internalId, groups },
          subEventTournament: {
            ...sub,
            EventTournamentId: eventTournamentDb.id
          }
        };
      });

      const subEventTournamentsDb = await SubEventTournament.bulkCreate(
        subEventTournaments.map(r => r.subEventTournament),
        { returning: ['id'], transaction }
      );

      const groupSubEventTournaments = [];
      subEventTournaments
        .map(r => r.subEventTournamentGroup)
        .forEach(element => {
          const subDb = subEventTournamentsDb.find(r => r.internalId === element.internalId);
          element.groups.forEach(group => {
            groupSubEventTournaments.push({ SubEventTournamentId: subDb.id, GroupId: group.id });
          });
        });

      await GroupSubEvents.bulkCreate(groupSubEventTournaments, { transaction });

      transaction.commit();
      return eventTournamentDb;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

const updateEventTournamentMutation = {
  type: EventTournamentType,
  args: {
    id: {
      name: 'Id',
      type: GraphQLInt
    },
    eventTournament: {
      name: 'EventTournament',
      type: EventTournamentInputType
    }
  },
  resolve: async (findOptions, { id, eventTournament }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:eventTournament'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await EventTournament.update(eventTournament, {
        where: { id: eventTournament.id },
        transaction
      });

      transaction.commit();
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

export { addEventTournamentMutation, updateEventTournamentMutation };
