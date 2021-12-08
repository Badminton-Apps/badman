import {
  AuthenticatedRequest,
  canExecute,
  DataBaseHandler,
  EventTournament,
  GroupSubEventTournament,
  logger,
  SubEventTournament
} from '@badvlasim/shared';
import { EventTournamentInputType, EventTournamentType } from '../types';

const addEventTournamentMutation = {
  type: EventTournamentType,
  args: {
    eventTournament: {
      name: 'EventTournament',
      type: EventTournamentInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { eventTournament },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`add:tournament`] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const eventTournamentDb = await EventTournament.create(eventTournament, { transaction });
      const subEventTournaments = eventTournament.subEventTournaments.map((subEventTournament) => {
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
        subEventTournaments.map((r) => r.subEventTournament),
        { returning: ['id'], transaction }
      );

      const groupSubEventTournaments = [];
      subEventTournaments
        .map((r) => r.subEventTournamentGroup)
        .forEach((element) => {
          const subDb = subEventTournamentsDb.find((r) => r.visualCode === element.visualCode);
          element.groups.forEach((group) => {
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
    eventTournament: {
      name: 'EventTournament',
      type: EventTournamentInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { eventTournament },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`edit:tournament`] });

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
