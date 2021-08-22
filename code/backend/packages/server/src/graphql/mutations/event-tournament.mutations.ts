import {
  DataBaseHandler,
  EventTournament,
  GroupSubEventTournament,
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
    if (context?.req?.user === null || !context.req.user.hasAnyPermission(['add:tournament'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['add:tournament', 'add-any:tournament']
        },
        received: context?.req?.user?.permissions
      });
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
          subEventTournamentGroup: { visualCode: sub.visualCode, groups },
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
          const subDb = subEventTournamentsDb.find(r => r.visualCode === element.visualCode);
          element.groups.forEach(group => {
            groupSubEventTournaments.push({ subEventId: subDb.id, groupId: group.id });
          });
        });

      await GroupSubEventTournament.bulkCreate(groupSubEventTournaments, { transaction });

      await transaction.commit();
      return eventTournamentDb;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
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
    if (
      context?.req?.user === null ||
      !context.req.user.hasAnyPermission(['edit:eventTournament', 'edit-any:tournament'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['edit:tournament', 'edit-any:tournament']
        },
        received: context?.req?.user?.permissions
      });
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

      await transaction.commit();
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export { addEventTournamentMutation, updateEventTournamentMutation };
