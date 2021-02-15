import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInputObjectType,
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
import { Draw } from '@badvlasim/shared/models';
import { GameType } from './game.type';
import { EventType } from './event.type';
import { RankingSystemGroupInputType } from './rankingSystemGroup.type';
import { getAttributeFields } from './attributes.type';
import { SubEventType } from './subEvent.type';

const DrawType = new GraphQLObjectType({
  name: 'Draw',
  description: 'A Draw',
  fields: () =>
    Object.assign(getAttributeFields(Draw), {
      games: {
        type: new GraphQLList(GameType),
        args: Object.assign(defaultListArgs(), {
          playerId: {
            description: 'id of the user',
            type: new GraphQLNonNull(GraphQLID)
          }
        }),
        resolve: resolver(Draw.associations.games, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          }
        })
      },
      gamesCount: {
        type: GraphQLInt,
        resolve: async (source: Draw, args, context, info) => {
          return context.models.Game.count({
            where: { DrawId: source.id }
          });
        }
      },
      subEvent: {
        type: SubEventType,
        resolve: resolver(Draw.associations.subEvent)
      }
    })
});

const DrawInputType = new GraphQLInputObjectType({
  name: 'DrawInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(getAttributeFields(Draw, true), {
      groups: {
        type: new GraphQLList(RankingSystemGroupInputType)
      }
    })
});

export { DrawType, DrawInputType };
