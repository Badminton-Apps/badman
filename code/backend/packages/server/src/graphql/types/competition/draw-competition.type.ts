import { DrawCompetition } from '@badvlasim/shared/models';
import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../../queryFixer';
import { getAttributeFields } from '../attributes.type';
import { GameType } from '../game.type';
import { RankingSystemGroupInputType } from '../rankingSystemGroup.type';
import { EncounterCompetitionType } from './encounter-competition.type';
import { SubEventCompetitionType } from './subEvent-competition.type';

const DrawCompetitionType = new GraphQLObjectType({
  name: 'DrawCompetition',
  description: 'A DrawCompetition',
  fields: () =>
    Object.assign(getAttributeFields(DrawCompetition), {
      encounters: {
        type: new GraphQLList(EncounterCompetitionType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(DrawCompetition.associations.encounters, { 
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      subEvent: {
        type: SubEventCompetitionType,
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(DrawCompetition.associations.subEvent, {
          before: async (findOptions, args, context, info) => {
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

const DrawCompetitionInputType = new GraphQLInputObjectType({
  name: 'DrawCompetitionInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(DrawCompetition, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      }),
      {
        groups: {
          type: new GraphQLList(RankingSystemGroupInputType)
        }
      }
    )
});

export { DrawCompetitionType, DrawCompetitionInputType };
