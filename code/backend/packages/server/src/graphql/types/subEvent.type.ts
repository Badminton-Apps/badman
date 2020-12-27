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
import { SubEvent } from '@badvlasim/shared/models';
import { GameType } from './game.type';
import { EventType } from './event.type';
import { RankingSystemGroupInputType } from './rankingSystemGroup.type';
import { getAttributeFields } from './attributes.type';

const SubEventType = new GraphQLObjectType({
  name: 'SubEvent',
  description: 'A SubEvent',
  fields: () =>
    Object.assign(getAttributeFields(SubEvent), {
      games: {
        type: new GraphQLList(GameType),
        args: Object.assign(defaultListArgs(), {
          playerId: {
            description: 'id of the user',
            type: new GraphQLNonNull(GraphQLID)
          }
        }),
        resolve: resolver(SubEvent.associations.games, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          }
        })
      },
      gamesCount: {
        type: GraphQLInt,
        resolve: async (source: SubEvent, args, context, info) => {
          return context.models.Game.count({
            where: { SubEventId: source.id }
          });
        }
      },
      event: {
        type: EventType,
        resolve: resolver(SubEvent.associations.event)
      }
    })
});

const SubEventInputType = new GraphQLInputObjectType({
  name: 'SubEventInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(getAttributeFields(SubEvent, true), {
      groups: {
        type: new GraphQLList(RankingSystemGroupInputType)
      }
    })
});

export { SubEventType, SubEventInputType };
