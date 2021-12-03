import {
  AuthenticatedRequest,
  Club,
  ClubMembership,
  DataBaseHandler,
  canExecute,
  logger,
  Player,
  Team
} from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLNonNull } from 'graphql';
import { ApiError } from '@badvlasim/shared/utils/api.error';
import { ClubInputType, ClubMembershipInputType, ClubMembershipType, ClubType } from '../types';

export const addClubMutation = {
  type: ClubType,
  args: {
    club: {
      name: 'Club',
      type: ClubInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { club },
    context: { req: AuthenticatedRequest }
  ) => {
    if (context?.req?.user === null || !context.req.user.hasAnyPermission(['add:club'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['add:club']
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
      const clubDb = await Club.create(club, { transaction });

      await transaction.commit();
      return clubDb;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const removeClubMutation = {
  type: GraphQLBoolean,
  args: {
    id: {
      name: 'ClubId',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { id },
    context: { req: AuthenticatedRequest }
  ) => {
    if (context?.req?.user === null || !context.req.user.hasAnyPermission(['remove:club'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['remove:club']
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
      await Club.destroy({ where: { id }, transaction, cascade: true });

      await transaction.commit();
      return true;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const addPlayerToClubMutation = {
  type: ClubType,
  args: {
    clubId: {
      name: 'clubId',
      type: GraphQLID
    },
    playerId: {
      name: 'playerId',
      type: GraphQLID
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { clubId, playerId },
    context: { req: AuthenticatedRequest }
  ) => {
    if (
      context?.req?.user === null ||
      !context.req.user.hasAnyPermission([`${clubId}_edit:club`, 'edit-any:club'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: [`${clubId}_edit:club`, 'edit-any:club']
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
      const dbClub = await Club.findByPk(clubId, {
        transaction
      });
      const dbPlayer = await Player.findByPk(playerId, {
        transaction
      });

      await dbClub.addPlayer(dbPlayer, {
        transaction,
        through: {
          start: new Date(),
          active: true
        }
      });

      await transaction.commit();
      return dbClub;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateClubMutation = {
  type: ClubType,
  args: {
    club: {
      name: 'Club',
      type: ClubInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { club },
    context: { req: AuthenticatedRequest }
  ) => {
    if (
      context?.req?.user === null ||
      !context.req.user.hasAnyPermission([`${club.id}_edit:club`, 'edit-any:club'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['edit-any:club'] // `${club.id}_edit:club`
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
      const dbClub = await Club.findByPk(club.id, { transaction });
      const dbClubCopy = dbClub.get({ plain: true, clone: true });
      if (!dbClub) {
        logger.debug('club', dbClub);
        throw new ApiError({
          code: 404,
          message: 'Club not found'
        });
      }

      await dbClub.update(club, {
        transaction
      });

      // Update team abbreaviations when club abbreviation changed
      if (dbClubCopy.abbreviation !== club.abbreviation) {
        const teams = await dbClub.getTeams({ where: { active: true }, transaction });
        logger.debug(`updating teams ${teams.length}`);
        for (const team of teams) {
          await Team.generateAbbreviation(team, { transaction });
          await team.save({ transaction });
        }
      }

      await transaction.commit();
      return dbClub;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateClubMembershipMutation = {
  type: ClubMembershipType,
  args: {
    clubMembership: {
      name: 'clubMembership',
      type: ClubMembershipInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { clubMembership },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`membership:club`] });
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbClubMembership = await ClubMembership.findByPk(clubMembership.id, { transaction });

      dbClubMembership.start = clubMembership.start;
      dbClubMembership.end = clubMembership.end;
      await dbClubMembership.save({ transaction });

      await transaction.commit();
      return dbClubMembership.toJSON();
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const addClubMembershipMutation = {
  type: ClubMembershipType,
  args: {
    clubMembership: {
      name: 'clubMembership',
      type: ClubMembershipInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { clubMembership },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`membership:club`] });
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      // Update current membership(s) to be inactive
      await ClubMembership.update(
        { end: clubMembership.start },
        {
          where: { end: null, playerId: clubMembership.playerId },
          transaction
        }
      );

      // Create new membership
      const dbClubMembership = await ClubMembership.create(clubMembership, { transaction });
      await dbClubMembership.save({ transaction });

      await transaction.commit();
      return dbClubMembership.toJSON();
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const deleteClubMembershipMutation = {
  type: ClubMembershipType,
  args: {
    clubMembershipId: {
      name: 'clubMembershipId',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { clubMembershipId },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`membership:club`] });
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await ClubMembership.destroy({
        where: { id: clubMembershipId },
        transaction
      });

      await transaction.commit();
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
