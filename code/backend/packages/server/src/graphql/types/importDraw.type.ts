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
import { Draw, ImportDraw } from '@badvlasim/shared/models';
import { GameType } from './game.type';
import { EventType } from './event.type';
import { RankingSystemGroupInputType } from './rankingSystemGroup.type';
import { getAttributeFields } from './attributes.type';
import { SubEventType } from './subEvent.type';

const ImportDrawType = new GraphQLObjectType({
  name: 'ImportDraw',
  description: 'A Imported subevent',
  fields: () => Object.assign(getAttributeFields(ImportDraw), {})
});

const ImportDrawConnectionType = createConnection({
  name: 'ImportDraw',
  nodeType: ImportDrawType,
  target: ImportDraw,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  }
});

export { ImportDrawType, ImportDrawConnectionType };

