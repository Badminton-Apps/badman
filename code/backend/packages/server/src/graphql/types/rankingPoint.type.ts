import { RankingPoint } from '@badvlasim/shared/models';
import { GraphQLNonNull, GraphQLObjectType } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { PlayerType } from './player.type';
import { RankingSystemType } from './rankingSystem.type';

const RankingPointType = new GraphQLObjectType({
  name: 'RankingPoint',
  description: 'A RankingPoint',
  fields: () =>
    Object.assign(getAttributeFields(RankingPoint), {
      type: {
        type: new GraphQLNonNull(RankingSystemType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingPoint.associations.type, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      player: {
        type: new GraphQLNonNull(PlayerType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingPoint.associations.player, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      }
    })
});

export { RankingPointType };
