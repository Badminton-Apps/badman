import { Claim } from '@badvlasim/shared';
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
import { getAttributeFields } from '../attributes.type';

export const ClaimType = new GraphQLObjectType({
  name: 'Claim',
  description: 'A Claim',
  fields: () => Object.assign(getAttributeFields(Claim), {})
});



export const ClaimInputType = new GraphQLInputObjectType({
  name: 'ClaimInput',
  description: 'A ClaimInput',
  fields: () => Object.assign(getAttributeFields(Claim, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }), {})
});

