import { Claim } from '@badvlasim/shared/models';
import { GraphQLList } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { ClaimType } from '../types/security/claim.type';

export const claimsQuery = {
  type: new GraphQLList(ClaimType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(Claim, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};
