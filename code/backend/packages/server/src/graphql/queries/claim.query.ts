import { GraphQLList, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Claim, Game } from '@badvlasim/shared/models';
import { ClaimType } from '../types/security/claim.type';

export const claimsQuery = {
  type: new GraphQLList(ClaimType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(Claim)
};
