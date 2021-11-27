import { Location } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { ClubType } from './club.type';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { EventTournamentType } from './tournaments';

export const LocationType = new GraphQLObjectType({
  name: 'Location',
  description: 'A Location',
  fields: () =>
    Object.assign(getAttributeFields(Location), {
      club: {
        type: new GraphQLList(ClubType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Location.associations.club, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      eventTournaments: {
        type: new GraphQLList(EventTournamentType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Location.associations.eventTournaments, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      }
    })
});

export const LocationInputType = new GraphQLInputObjectType({
  name: 'LocationInput',
  description: 'This represents a LocationInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Location, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] })
    )
});
