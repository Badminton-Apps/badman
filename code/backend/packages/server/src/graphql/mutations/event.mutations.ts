import { Event, GroupSubEvents, logger, SubEvent, DataBaseHandler } from '@badvlasim/shared';
import { GraphQLInt } from 'graphql';
import { Sequelize, Transaction } from 'sequelize/types';
import { ApiError } from '../../models/api.error';
import { EventInputType, EventType } from '../types';

const addEventMutation = {
  type: EventType,
  args: {
    event: {
      name: 'Event',
      type: EventInputType
    }
  },
  resolve: async (findOptions, { event }, context) => {
    if (!context.req.user.hasAnyPermission(['add:event'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const eventDb = await Event.create(
        {
          ...event,
          id: null
        },
        { transaction }
      );
      const subEvents = event.subEvents.map(subEvent => {
        const { groups, ...sub } = subEvent;

        return {
          subEventGroup: { internalId: sub.internalId, groups },
          subEvent: {
            ...sub,
            id: null,
            EventId: eventDb.id
          }
        };
      });

      const subEventsDb = await SubEvent.bulkCreate(
        subEvents.map(r => r.subEvent),
        { returning: ['id'], transaction }
      );

      const groupSubEvents = [];
      subEvents
        .map(r => r.subEventGroup)
        .forEach(element => {
          const subDb = subEventsDb.find(r => r.internalId === element.internalId);
          element.groups.forEach(group => {
            groupSubEvents.push({ SubEventId: subDb.id, GroupId: group.id });
          });
        });

      await GroupSubEvents.bulkCreate(groupSubEvents, { transaction });

      transaction.commit();
      return eventDb;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

const updateEventMutation = {
  type: EventType,
  args: {
    id: {
      name: 'Id',
      type: GraphQLInt
    },
    event: {
      name: 'Event',
      type: EventInputType
    }
  },
  resolve: async (findOptions, { id, event }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:club'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await Event.update(event, {
        where: { id: event.id },
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

export { addEventMutation, updateEventMutation };
