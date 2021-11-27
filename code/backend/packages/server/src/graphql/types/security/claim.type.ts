import { Claim } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import { getAttributeFields } from '../attributes.type';

export const ClaimType = new GraphQLObjectType({
  name: 'Claim',
  description: 'A Claim',
  fields: () => Object.assign(getAttributeFields(Claim), {})
});

export const ClaimInputType = new GraphQLInputObjectType({
  name: 'ClaimInput',
  description: 'A ClaimInput',
  fields: () =>
    Object.assign(
      getAttributeFields(Claim, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }),
      {}
    )
});
