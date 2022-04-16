import {
  ApiError,
  AuthenticatedRequest,
  canExecute,
  DataBaseHandler,
  EventCompetition,
  logger,
  SubEventCompetition
} from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull, GraphQLInt } from 'graphql';
import { EventCompetitionInputType, EventCompetitionType } from '../types';

export const addEventCompetitionMutation = {
  type: EventCompetitionType,
  args: {
    eventCompetition: {
      name: 'EventCompetition',
      type: EventCompetitionInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { eventCompetition }: { eventCompetition: Partial<EventCompetition> },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`add:competition`] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const eventCompetitionDb = await EventCompetition.create(eventCompetition, { transaction });

      const subEventCompetitionsDb = await SubEventCompetition.bulkCreate(
        eventCompetition.subEvents?.map((r) => {
          return { ...r, eventId: eventCompetitionDb.id };
        }),
        { returning: ['id'], transaction }
      );

      eventCompetitionDb.subEvents = subEventCompetitionsDb;

      await transaction.commit();
      return eventCompetitionDb;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const copyEventCompetitionMutation = {
  type: EventCompetitionType,
  args: {
    id: {
      name: 'Id',
      type: new GraphQLNonNull(GraphQLID)
    },
    year: {
      name: 'year',
      type: new GraphQLNonNull(GraphQLInt)
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { id, year }: { id: string; year: number },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`add:competition`] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const eventCompetitionDb = await EventCompetition.findByPk(id, {
        transaction,
        include: [{ model: SubEventCompetition }]
      });
      const newName = `${eventCompetitionDb.name.replace(/(\d{4}-\d{4})/gi, '').trim()} ${year}-${
        year + 1
      }`;

      const newEventCompetitionDb = new EventCompetition({
        ...eventCompetitionDb.toJSON(),
        id: undefined,
        startYear: year,
        name: newName
      });

      const newEventCompetitionDbSaved = await newEventCompetitionDb.save({ transaction });
      const newSubEvents = [];
      for (const subEventCompetition of eventCompetitionDb.subEvents) {
        const newSubEventCompetitionDb = new SubEventCompetition({
          ...subEventCompetition.toJSON(),
          id: undefined,
          eventId: newEventCompetitionDbSaved.id
        });
        await newSubEventCompetitionDb.save({ transaction });
        newSubEvents.push(newSubEventCompetitionDb);
      }

      newEventCompetitionDbSaved.subEvents = newSubEvents;

      await transaction.commit();
      return newEventCompetitionDb;
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
  resolve: async (
    findOptions: { [key: string]: object },
    { eventCompetition }: { eventCompetition: Partial<EventCompetition> },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`edit:competition`] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbEvent = await EventCompetition.findByPk(eventCompetition.id, {
        include: [{ model: SubEventCompetition, attributes: ['id', 'name'] }],
        transaction
      });

      if (!dbEvent) {
        throw new ApiError({
          code: 404,
          message: 'Event not found'
        });
      }

      // Update sub event competitions
      for (const subEvent of eventCompetition?.subEvents ?? []) {
        if (subEvent.id) {
          await SubEventCompetition.update(subEvent, {
            where: { id: subEvent.id },
            transaction
          });
        } else {
          const newSubEvent = await SubEventCompetition.create({ ...subEvent }, { transaction });
          await dbEvent.addSubEvent(newSubEvent, { transaction });
        }
      }

      // Delete removed events
      if (eventCompetition?.subEvents?.length > 0) {
        for (const subEvent of dbEvent.subEvents) {
          if (!eventCompetition.subEvents.find((r) => r.id === subEvent.id)) {
            await SubEventCompetition.destroy({
              where: { id: subEvent.id },
              transaction
            });
          }
        }
      }

      await dbEvent.update(eventCompetition, { transaction });

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
  resolve: async (
    findOptions: { [key: string]: object },
    { id, groupIds },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, {
      anyPermissions: ['edit:competition']
    });

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
