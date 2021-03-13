import {
  DataBaseHandler,
  EventCompetition,
  GroupSubEvents,
  logger,
  SubEventCompetition
} from '@badvlasim/shared';
import { GraphQLInt } from 'graphql';
import { ApiError } from '../../models/api.error';
import { EventCompetitionInputType, EventCompetitionType } from '../types';

const addEventCompetitionMutation = {
  type: EventCompetitionType,
  args: {
    eventCompetition: {
      name: 'EventCompetition',
      type: EventCompetitionInputType
    }
  },
  resolve: async (findOptions, { eventCompetition }, context) => {
    if (!context.req.user.hasAnyPermission(['add:eventCompetition'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const eventCompetitionDb = await EventCompetition.create(eventCompetition, { transaction });
      const subEventCompetitions = eventCompetition.subEventCompetitions.map(
        subEventCompetition => {
          const { groups, ...sub } = subEventCompetition;

          return {
            subEventCompetitionGroup: { internalId: sub.internalId, groups },
            subEventCompetition: {
              ...sub,
              EventCompetitionId: eventCompetitionDb.id
            }
          };
        }
      );

      const subEventCompetitionsDb = await SubEventCompetition.bulkCreate(
        subEventCompetitions.map(r => r.subEventCompetition),
        { returning: ['id'], transaction }
      );

      const groupSubEventCompetitions = [];
      subEventCompetitions
        .map(r => r.subEventCompetitionGroup)
        .forEach(element => {
          const subDb = subEventCompetitionsDb.find(r => r.internalId === element.internalId);
          element.groups.forEach(group => {
            groupSubEventCompetitions.push({ SubEventCompetitionId: subDb.id, GroupId: group.id });
          });
        });

      await GroupSubEvents.bulkCreate(groupSubEventCompetitions, { transaction });

      transaction.commit();
      return eventCompetitionDb;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

const updateEventCompetitionMutation = {
  type: EventCompetitionType,
  args: { 
    id: {
      name: 'Id',
      type: GraphQLInt
    },
    eventCompetition: {
      name: 'EventCompetition',
      type: EventCompetitionInputType
    }
  },
  resolve: async (findOptions, { id, eventCompetition }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:eventCompetition'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await EventCompetition.update(eventCompetition, {
        where: { id: eventCompetition.id },
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

export { addEventCompetitionMutation, updateEventCompetitionMutation };
