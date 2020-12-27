import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';
import {
  attributeFields,
  createConnection,
  defaultListArgs,
  resolver
} from 'graphql-sequelize';
import { col, fn, Includeable, Op, or, QueryTypes, where } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { RankingPlace } from '@badvlasim/shared/models';
import { PlayerType } from './player.type';
import { RankingSystemType } from './rankingSystem.type';
import { getAttributeFields } from './attributes.type';

const RankingPlaceType = new GraphQLObjectType({
  name: 'RankingPlace',
  description: 'A RankingPlace',
  fields: () =>
    Object.assign(getAttributeFields(RankingPlace), {
      rankingSystem: {
        type: RankingSystemType,
        resolve: resolver(RankingPlace.associations.rankingSystem)
      },
      player: {
        type: new GraphQLNonNull(PlayerType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingPlace.associations.player)
      }
    })
});

export { RankingPlaceType };
