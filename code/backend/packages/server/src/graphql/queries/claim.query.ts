import { GraphQLList, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Claim, Game } from '@badvlasim/shared/models';
import { ClaimType } from '../types/security/claim.type';
import { queryFixer } from '../queryFixer';

export const claimsQuery = {
  type: new GraphQLList(ClaimType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(Claim, {
    before: async (findOptions, args, context, info) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};
