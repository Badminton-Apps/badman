import { CommentType } from './../comment.type';
import { LocationType } from './../location.type';
import { EventCompetition } from '@badvlasim/shared';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../../queryFixer';
import { getAttributeFields } from '../attributes.type';
import { SubEventCompetitionInputType, SubEventCompetitionType } from './subEvent-competition.type';

export const EventCompetitionType = new GraphQLObjectType({
  name: 'EventCompetition',
  description: 'A EventCompetition',
  fields: () =>
    Object.assign(getAttributeFields(EventCompetition), {
      subEvents: {
        type: new GraphQLList(SubEventCompetitionType),
        args: Object.assign(defaultListArgs(), {
          direction: {
            type: GraphQLString
          },
          order: {
            type: GraphQLString
          }
        }),
        resolve: resolver(EventCompetition.associations.subEvents, {
          before: async (findOptions, args, context, info) => {
            if (args.order) {
              findOptions = {
                ...findOptions,
                order: [[args.order, args.direction ?? "asc"], ['level', 'asc']]
              };
            }
            return findOptions;
          }
        })
      },
      comments: {
        type: new GraphQLList(CommentType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(EventCompetition.associations.comments)
      }
    })
});

export const EventCompetitionInputType = new GraphQLInputObjectType({
  name: 'EventCompetitionInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(EventCompetition, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      }),
      {
        subEvents: {
          type: new GraphQLList(SubEventCompetitionInputType)
        }
      }
    )
});

export const EventCompetitionConnectionType = createConnection({
  name: 'EventCompetition',
  nodeType: EventCompetitionType,
  target: EventCompetition,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  orderBy: new GraphQLEnumType({
    name: 'EventCompetitionOrderBy',
    values: {
      DATE_ASC: { value: ['startYear', 'ASC'] }, // The first ENUM value will be the default order. The direction will be used for `first`, will automatically be inversed for `last` lookups.
      DATE_DESC: { value: ['startYear', 'DESC'] }
    }
  }),
  where: (key, value, currentWhere) => {
    if (key === 'where') {
      return queryFixer(value);
    } else {
      return { [key]: value };
    }
  }
});
