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
import { DrawType } from './draw.type';
import { EventType } from './event.type';
import { RankingSystemGroupInputType } from './rankingSystemGroup.type';
import { getAttributeFields } from './attributes.type';

const SubEventType = new GraphQLObjectType({
  name: 'SubEvent',
  description: 'A SubEvent',
  fields: () =>
    Object.assign(getAttributeFields(SubEvent), {
      draw: {
        type: new GraphQLList(DrawType),
        resolve: resolver(SubEvent.associations.draws, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          }
        })
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
