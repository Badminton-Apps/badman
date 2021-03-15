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
import { PlayerType } from './player.type';
import moment from 'moment';
import { SubEventCompetitionType } from './competition';

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
      firstTeam: {
        type: GraphQLBoolean
      },
      baseIndex: {
        type: GraphQLInt,
        args: Object.assign({
          systemId: {
            type: GraphQLID
          }
        }),
        resolve: async (parent: Team, args, context, info) => {
          if (!args.systemId) {
            return -1;
          }
          const players = await parent.getPlayers({
            through: { where: { base: true } },
            include: [
              {
                model: RankingPlace,
                where: { SystemId: args.systemId },
                limit: 1,
                order: [['rankingDate', 'desc']]
              }
            ]
          } as any);
          if (players && players.length > 0) {
            const validBasePlayers = players
              .filter(r => r.getDataValue('TeamPlayerMembership').base == true)
              .filter(r => r.rankingPlaces != null && r.rankingPlaces.length > 0);

            if (!validBasePlayers) {
              return -1;
            }

            switch (parent.type) {
              case 'MX':
                return validBasePlayers.reduce(
                  (acc, cur) =>
                    acc +
                    cur.rankingPlaces[0].single +
                    cur.rankingPlaces[0].double +
                    cur.rankingPlaces[0].mix,
                  0
                );
              case 'F':
              case 'M':
                return validBasePlayers.reduce(
                  (acc, cur) => acc + cur.rankingPlaces[0].single + cur.rankingPlaces[0].double,
                  0
                );
            }
          }
        }
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
