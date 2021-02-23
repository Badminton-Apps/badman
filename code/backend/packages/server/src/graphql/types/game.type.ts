import {GraphQLList, GraphQLObjectType, GraphQLString} from 'graphql';
import { attributeFields, defaultListArgs, resolver } from 'graphql-sequelize';
import {Game, Player} from '@badvlasim/shared/models';
import { GamePlayerType } from './gamePlayer.type';
import { getAttributeFields } from './attributes.type';
import { DrawCompetitionType } from './competition';
import { DrawTournamentType } from './tournaments';
import {RankingPointType} from "./rankingPoint.type";

const GameType = new GraphQLObjectType({
  name: 'Game',
  description: 'A Game',
  fields: () =>
    Object.assign(getAttributeFields(Game), {
      players: {
        type: new GraphQLList(GamePlayerType),
        resolve: resolver(Game.associations.players, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          },
          after: (result, args, context) => {
            return result.map(player => {
              player.team = player.getDataValue('GamePlayer').team;
              player.player = player.getDataValue('GamePlayer').player;
              return player;
            });
          }
        })
      }, 
      drawCompetition: {
        type: DrawCompetitionType,
        resolve: resolver(Game.associations.drawCompetition)
      },
      rankingPoints: {
        type: new GraphQLList(RankingPointType),
        args: Object.assign(defaultListArgs(), {
          direction: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Game.associations.rankingPoints, {
          before: async (findOptions, args, context, info) => {
            if (args.order && args.direction) {
              findOptions = {
                ...findOptions,
                order: [[args.order, args.direction]]
              };
            }
            return findOptions;
          }
        })
      },
      drawTournament: {
        type: DrawTournamentType,
        resolve: resolver(Game.associations.drawTournament)
      }
    })
});

export { GameType };
