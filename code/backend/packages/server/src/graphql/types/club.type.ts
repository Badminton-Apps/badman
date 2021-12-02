import { Club, ClubMembership, Player } from '@badvlasim/shared/models';
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
          before: async (findOptions: { [key: string]: object }) => {
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
          before: async (findOptions: { [key: string]: object }) => {
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
          before: async (findOptions: { [key: string]: object }) => {
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
        resolve: async (obj: Club, args: { [key: string]: object }) => {
          let where = {};

          if (args.where) {
            where = queryFixer(args.where);
          }

          const club = await Club.findOne({
            attributes: ['id'],
            where: { id: obj.id },
            include: [{ model: Player, required: false, where, through: { where: { end: null } } }]
          });

          return club?.players;
        }
      },
      clubMembership: {
        type: ClubMembershipType
      }
    })
});

export const ClubMembershipType = new GraphQLObjectType({
  name: 'ClubMembership',
  description: 'A Club bMembership',
  fields: () => Object.assign(getAttributeFields(ClubMembership))
});

export const ClubInputType = new GraphQLInputObjectType({
  name: 'ClubInput',
  description: 'This represents a ClubnputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Club, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] })
    )
});

export const ClubMembershipInputType = new GraphQLInputObjectType({
  name: 'ClubMembershipInput',
  description: 'A Club Membership input type',
  fields: () =>
    Object.assign(
      getAttributeFields(ClubMembership, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id', 'playerId', 'clubId']
      })
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
  where: (key: string, value: unknown) => {
    if (key === 'where') {
      return queryFixer(value);
    } else {
      return { [key]: value };
    }
  }
});
