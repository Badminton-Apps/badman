import { Club } from '@badvlasim/shared/models';
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

export const ClubType = new GraphQLObjectType({
  name: 'Club',
  description: 'A Club',
  fields: () =>
    Object.assign(getAttributeFields(Club), {
      teams: {
        type: new GraphQLList(TeamType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Club.associations.teams)
      },
      roles: {
        type: new GraphQLList(RoleType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Club.associations.roles)
      },
      players: {
        type: new GraphQLList(PlayerType),
        args: Object.assign(defaultListArgs(), {
          end: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Club.associations.players, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          },
          after: (result, args, context) => {
            // Only get after certain period
            if (args.end) {
              result = result // not empty
                .filter(p => p)
                .filter(p => p.getDataValue('ClubMembership') != null)
                // then filter
                .filter(
                  player =>
                    // no end
                    player.getDataValue('ClubMembership').end == null ||
                    // or in future
                    moment(player.getDataValue('ClubMembership').end).isSameOrAfter(args.end)
                );
            }

            return result;
          }
        })
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
