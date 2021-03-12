import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';
import { attributeFields, createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { col, fn, Includeable, Op, or, QueryTypes, where } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Player } from '@badvlasim/shared/models';
import { GameType } from './game.type';
import { RankingPlaceType } from './rankingPlace.type';
import { RankingPointType } from './rankingPoint.type';
import { TeamType } from './team.type';
import { getAttributeFields } from './attributes.type';
import { logger } from '@badvlasim/shared';

const PlayerType = new GraphQLObjectType({
  name: 'Player',
  description: 'A Player',
  fields: () =>
    Object.assign(getAttributeFields(Player), {
      teams: {
        type: new GraphQLList(TeamType),
        resolve: resolver(Player.associations.teams, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          }
        })
      },
      rankingPlaces: {
        type: new GraphQLList(RankingPlaceType),
        args: Object.assign(defaultListArgs(), {
          direction: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Player.associations.rankingPlaces, {
          before: async (findOptions, args, context, info) => {
            findOptions.where = { 
              ...findOptions.where
            };
            findOptions.order =
              args.order && args.direction
                ? [[args.order, args.direction]]
                : [['rankingDate', 'DESC']];
            findOptions.limit = args.limit;
            return findOptions;
          }
        })
      },
      rankingPoints: {
        type: new GraphQLList(RankingPointType),
        args: Object.assign(defaultListArgs(), {
          direction: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Player.associations.rankingPoints, {
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
      games: {
        type: new GraphQLList(GameType),
        args: Object.assign(defaultListArgs(), {
          direction: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Player.associations.games, {
          before: async (findOptions, args, context, info) => {
            if (args.order && args.direction) {
              findOptions = {
                ...findOptions,
                order: [
                  [args.order, args.direction],
                  ['id', 'desc']
                ]
              };
            }
            return findOptions;
          }
        })
      },
      base: {
        type: GraphQLBoolean
      }
    })
});
export { PlayerType };
