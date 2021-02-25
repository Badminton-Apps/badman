import {GraphQLNonNull, GraphQLObjectType} from 'graphql';
import { attributeFields, defaultListArgs, resolver } from 'graphql-sequelize';
import {RankingPlace, RankingPoint} from '@badvlasim/shared/models';
import { RankingSystemType } from './rankingSystem.type';
import { getAttributeFields } from './attributes.type';
import {PlayerType} from "./player.type";

const RankingPointType = new GraphQLObjectType({
  name: 'RankingPoint',
  description: 'A RankingPoint',
  fields: () =>
    Object.assign(getAttributeFields(RankingPoint), {
      type: {
        type: new GraphQLNonNull(RankingSystemType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingPoint.associations.type)
      },
      player: {
        type: new GraphQLNonNull(PlayerType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingPoint.associations.player)
      }
    })
});

export { RankingPointType };
