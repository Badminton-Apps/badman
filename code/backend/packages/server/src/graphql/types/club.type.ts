import { Club, Player, PlayerRoleMembership, SubEventType, Team } from '@badvlasim/shared/models';
import {
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { createConnection, defaultListArgs, resolver, attributeFields } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { PlayerType } from './player.type';
import { TeamType } from './team.type';
import moment from 'moment';
import { getAttributeFields } from './attributes.type';
import { RoleType } from './security';
import { LocationType } from './location.type';
import { logger } from '@badvlasim/shared';
import { O_NONBLOCK } from 'constants';

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
        resolve: resolver(Club.associations.roles)
      },
      locations: {
        type: new GraphQLList(LocationType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Club.associations.locations)
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
        // resolve: resolver(Club.associations.players, {
        //   before: async (findOptions, args, context, info) => {
        //     return findOptions;
        //   },
        //   after: (result, args, context) => {
        //     if (!args.end) {
        //       result = result // not empty
        //         .filter((player: Player) => player?.getDataValue('ClubMembership') != null);
        //     } else {
        //       result = result // not empty
        //         .filter((player: Player) => player?.getDataValue('ClubMembership') != null)
        //         // then filter
        //         .filter(
        //           (player: Player) =>
        //             // no end
        //             player.getDataValue('ClubMembership').end == null ||
        //             // or in future
        //             moment(player.getDataValue('ClubMembership').end).isSameOrAfter(args.end)
        //         );
        //     }

        //     return result;
        //   }
        // })
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
