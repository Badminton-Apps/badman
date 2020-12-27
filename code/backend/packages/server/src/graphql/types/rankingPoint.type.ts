import { GraphQLObjectType } from 'graphql';
import { attributeFields, resolver } from 'graphql-sequelize';
import { RankingPoint } from '@badvlasim/shared/models';
import { RankingSystemType } from './rankingSystem.type';
import { getAttributeFields } from './attributes.type';

const RankingPointType = new GraphQLObjectType({
  name: 'RankingPoint',
  description: 'A RankingPoint',
  fields: () =>
    Object.assign(getAttributeFields(RankingPoint), {
      rankingSystem: {
        type: RankingSystemType,
        resolve: () => resolver(RankingPoint.associations.rankingSystem)
      }
    })
});

export { RankingPointType };
