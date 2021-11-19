import { EncounterChange, EncounterChangeDate } from '@badvlasim/shared/models';
import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../../../queryFixer';
import { getAttributeFields } from '../../attributes.type';
import { CommentInputType, CommentType } from '../../comment.type';
import { EncounterCompetitionType } from '../encounter-competition.type';
import { EncounterChangeDateInputType, EncounterChangeDateType } from './change-encounter-date.type';

const EncounterChangeType = new GraphQLObjectType({
  name: 'EncounterChange',
  description: 'A EncounterChange',
  fields: () =>
    Object.assign(getAttributeFields(EncounterChange), {
      encounter: {
        type: EncounterCompetitionType,
        resolve: resolver(EncounterChange.associations.encounter)
      },
      dates: {
        type: new GraphQLList(EncounterChangeDateType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(EncounterChange.associations.dates, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      homeComment: {
        type: CommentType,
        resolve: resolver(EncounterChange.associations.homeComment)
      },
      awayComment: {
        type: CommentType,
        resolve: resolver(EncounterChange.associations.awayComment)
      }
    })
});

const EncounterChangeInputType = new GraphQLInputObjectType({
  name: 'EncounterChangeInput',
  description: 'This represents a EncounterChangeInput',
  fields: () =>
    Object.assign(
      getAttributeFields(EncounterChange, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      }),
      {
        home: {
          type: GraphQLBoolean
        },
        dates: {
          type: new GraphQLList(EncounterChangeDateInputType)
        },
        comment: {
          type: CommentInputType
        }
      }
    )
});

export { EncounterChangeType, EncounterChangeInputType };
