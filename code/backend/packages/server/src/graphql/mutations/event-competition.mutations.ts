import {
  DataBaseHandler,
  EventCompetition,
  GroupSubEventCompetition,
  logger,
  SubEventCompetition
} from '@badvlasim/shared';
import { GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull } from 'graphql';
import { ApiError } from '../../models/api.error';
import { EventCompetitionInputType, EventCompetitionType } from '../types';

export const addEventCompetitionMutation = {
  type: EventCompetitionType,
  args: {
    eventCompetition: {
      name: 'EventCompetition',
      type: EventCompetitionInputType
    }
  },
  resolve: async (findOptions, { eventCompetition }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['add:competition'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['add:competition']
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
      // subEventCompetitions
      //   .map(r => r.subEventCompetitionGroup)
      //   .forEach(element => {
      //     const subDb = subEventCompetitionsDb.find(r => r.internalId === element.internalId);
      //     element.groups.forEach(group => {
      //       groupSubEventCompetitions.push({ subEventId: subDb.id, groupId: group.id });
      //     });
      //   });

      await GroupSubEventCompetition.bulkCreate(groupSubEventCompetitions, { transaction });

      await transaction.commit();
      return eventCompetitionDb;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateEventCompetitionMutation = {
  type: EventCompetitionType,
  args: {
    eventCompetition: {
      name: 'EventCompetition',
      type: EventCompetitionInputType
    }
  },
  resolve: async (findOptions, { eventCompetition }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['edit:competition'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['edit:competition']
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
      await EventCompetition.update(eventCompetition, {
        where: { id: eventCompetition.id },
        transaction
      });

      for (const subEvent of eventCompetition?.subEvents ?? []) {
        await SubEventCompetition.update(subEvent, {
          where: { id: subEvent.id },
          transaction
        });
      }

      await transaction.commit();
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const setGroupsCompetitionMutation = {
  type: EventCompetitionType,
  args: {
    id: {
      name: 'Id',
      type: new GraphQLNonNull(GraphQLID)
    },
    groupIds: {
      name: 'groupIds',
      type: new GraphQLList(GraphQLID)
    }
  },
  resolve: async (findOptions, { id, groupIds }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['edit:competition'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['edit:competition']
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
      const dbComp = await EventCompetition.findByPk(id, { transaction });

      if (!dbComp) {
        throw new ApiError({
          code: 404,
          message: 'Competition not found'
        });
      }

      for (const subEvent of await dbComp.getSubEvents({ transaction })) {
        await subEvent.setGroups(groupIds, { transaction });
      }
      await transaction.commit();
      return dbComp;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
