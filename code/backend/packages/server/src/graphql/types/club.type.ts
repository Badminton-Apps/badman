import { Club, Player } from '@badvlasim/shared/models';
import {
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { LocationType } from './location.type';
import { PlayerType } from './player.type';
import { RoleType } from './security';
import { TeamType } from './team.type';

export const ClubType = new GraphQLObjectType({
  name: 'Club',
  description: 'A Club',
  fields: () =>
    Object.assign(getAttributeFields(Club), {
      teams: {
        type: new GraphQLList(TeamType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Club.associations.teams, {
          before: async (findOptions, args, context, info) => {
            findOptions.where = queryFixer(findOptions.where);
            findOptions.order = [
              ['type', 'asc'],
              ['teamNumber', 'asc']
            ];
            return findOptions;
          }
        })
      },
      roles: {
        type: new GraphQLList(RoleType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Club.associations.roles, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      locations: {
        type: new GraphQLList(LocationType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Club.associations.locations, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      players: {
        type: new GraphQLList(PlayerType),
        args: Object.assign(defaultListArgs(), {
          end: {
            type: GraphQLString
          }
        }),
        resolve: async (obj: Club, args, context, info) => {
          let where = {}

          if (args.where){
            where = queryFixer(args.where);
          }

          const club = await Club.findOne({
            attributes: ['id'],
            where: { id: obj.id },
            include: [
              { model: Player, required: false, where, through: { where: { end: null } } }
            ]
          });

          return club?.players;
        }
        
      }
    })
});

export const ClubInputType = new GraphQLInputObjectType({
  name: 'ClubInput',
  description: 'This represents a ClubnputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Club, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] })
    )
});

export const ClubConnectionType = createConnection({
  name: 'Club',
  nodeType: ClubType,
  target: Club,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  where: (key, value, currentWhere) => {
    if (key === 'where') {
      return queryFixer(value);
    } else {
      return { [key]: value };
    }
  }
});
