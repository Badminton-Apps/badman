import { logger } from '@badvlasim/shared';
import { RankingPlace, Team } from '@badvlasim/shared/models';
import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { getAttributeFields } from './attributes.type';
import { PlayerInputType, PlayerType } from './player.type';
import moment from 'moment';
import { SubEventCompetitionType } from './competition';
import { ClubType } from './club.type';

export const TeamType = new GraphQLObjectType({
  name: 'Team',
  description: 'A Team',
  fields: () =>
    Object.assign(getAttributeFields(Team), {
      club: {
        type: ClubType,
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Team.associations.club)
      },
      players: {
        type: new GraphQLList(PlayerType),
        args: Object.assign(defaultListArgs(), {
          end: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Team.associations.players, {
          before: async (findOptions, args, context, info) => {
            // findOptions.order = [
            //   ['lastName', 'asc'],
            //   ['firstName', 'asc']
            // ];
            return findOptions;
          },
          after: (result, args, context) => {
            // Only get after certain period
            if (args.end) {
              result
                // not empty
                .filter(p => p != null)
                .filter(p => p.getDataValue('TeamPlayerMembership') != null)
                // then filter
                .filter(player => {
                  return moment(player.getDataValue('TeamPlayerMembership').end).isSameOrAfter(
                    args.end
                  );
                });
            }

            return result.map(player => {
              player.base = player.getDataValue('TeamPlayerMembership')?.base;
              return player;
            });
          }
        })
      },
      subEvents: {
        type: new GraphQLList(SubEventCompetitionType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Team.associations.subEvents)
      },
      captain: {
        type: PlayerType,
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Team.associations.captain)
      }
    })
});

export const TeamInputType = new GraphQLInputObjectType({
  name: 'TeamInput',
  description: 'This represents a TeamInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Team, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }),
      {
        players: {
          type: PlayerInputType
        }
      }
    )
});
