import { GraphQLObjectType } from 'graphql';
import { attributeFields, resolver } from 'graphql-sequelize';
import { RankingPoint } from '@badvlasim/shared/models';
import { RankingSystemType } from './rankingSystem.type';
import { getAttributeFields } from './attributes.type';
import {PlayerType} from "./player.type";

const RankingPointType = new GraphQLObjectType({
  name: 'RankingPoint',
  description: 'A RankingPoint',
  fields: () =>
    Object.assign(getAttributeFields(RankingPoint), {
      rankingSystem: {
        type: RankingSystemType,
        resolve: () => resolver(RankingPoint.associations.rankingSystem)
      },
      player: {
        type: PlayerType,
        resolve: () => resolver(RankingPoint.associations.player, {
          before: async (findOptions, args, context, info) => {
            return findOptions;
          }
        })
      }
    })
});

export { RankingPointType };
