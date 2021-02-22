import { logger } from '@badvlasim/shared';
import { Team } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { getAttributeFields } from './attributes.type';
import { PlayerType } from './player.type';
import moment from 'moment';

export const TeamType = new GraphQLObjectType({
  name: 'Team',
  description: 'A Team',
  fields: () =>
    Object.assign(getAttributeFields(Team), {
      players: {
        type: new GraphQLList(PlayerType),
        args: Object.assign(defaultListArgs(), {
          end: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Team.associations.players, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          },
          after: (result, args, context) => {
            // Only get after certain period
            if (args.end) {
              result = result.filter(player =>
                moment(player.getDataValue('TeamMembership').end).isSameOrAfter(args.end)
              );
            }

            return result;
          }
        })
      }
    })
});

export const TeamInputType = new GraphQLInputObjectType({
  name: 'TeamInput',
  description: 'This represents a TeamnputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Team, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] })
    )
});
