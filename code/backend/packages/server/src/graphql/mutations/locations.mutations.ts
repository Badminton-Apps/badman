import { DataBaseHandler, Location, logger } from '@badvlasim/shared';
import { GraphQLID, GraphQLNonNull, GraphQLBoolean } from 'graphql';
import { ApiError } from '../../models/api.error';
import { LocationInputType, LocationType } from '../types';

export const addLocationMutation = {
  type: LocationType,
  args: {
    location: {
      name: 'Location',
      type: new GraphQLNonNull(LocationInputType)
    },
    clubId: {
      name: 'clubId',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (findOptions, { location, clubId }, context) => {
    if (
      context?.req?.user == null ||
      !context.req.user.hasAnyPermission([`${clubId}_add:location`, 'edit-any:club'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: [`${clubId}_add:location`, 'edit-any:club']
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
      const [locationDb, created] = await Location.findOrCreate({
        where: {
          name: location.name,
          clubId
        },
        defaults: location,
        transaction
      });

      if (created) {
        await locationDb.setClub(clubId, { transaction });
      }

      await transaction.commit();
      return locationDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const removeLocationMutation = {
  type: LocationType,
  args: {
    locationId: {
      name: 'locationId',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { locationId, playerId }, context) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbLocation = await Location.findByPk(locationId, { transaction });

      if (!dbLocation) {
        logger.debug('location', dbLocation);
        throw new ApiError({
          code: 404,
          message: 'Location not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([
          `${dbLocation.clubId}_remove:location`,
          'edit-any:club'
        ])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbLocation.clubId}_remove:location`, 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }

      await dbLocation.destroy({ transaction });

      await transaction.commit();
      return dbLocation;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateTournamentEventLocationMutation = {
  type: LocationType,
  args: {
    locationId: {
      name: 'locationId',
      type: GraphQLID
    },
    eventId: {
      name: 'eventId',
      type: GraphQLID
    },
    use: {
      name: 'use',
      type: GraphQLBoolean
    }
  },
  resolve: async (findOptions, { locationId, eventId, use }, context) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbLocation = await Location.findByPk(locationId, { transaction });

      if (!dbLocation) {
        logger.debug('location', dbLocation);
        throw new ApiError({
          code: 404,
          message: 'location not found'
        });
      }

      if (use) {
        await dbLocation.addEventTournament(eventId, { transaction });
      } else {
        await dbLocation.removeEventTournament(eventId, { transaction });
      }

      await transaction.commit();
      return dbLocation;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateLocationMutation = {
  type: LocationType,
  args: {
    location: {
      name: 'Location',
      type: LocationInputType
    }
  },
  resolve: async (findOptions, { location }, context) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbLocation = await Location.findByPk(location.id,{ transaction });

      if (!dbLocation) {
        logger.debug('location', dbLocation);
        throw new ApiError({
          code: 404,
          message: 'Location not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([`${dbLocation.clubId}_edit:location`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbLocation.clubId}_edit:location`, 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }

      await dbLocation.update(location, { transaction });
      await transaction.commit();
      return dbLocation;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
