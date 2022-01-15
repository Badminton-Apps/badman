import { SubEventCompetition } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { EntryType } from '..';
import { queryFixer } from '../../queryFixer';
import { getAttributeFields } from '../attributes.type';
import { RankingSystemGroupInputType, RankingSystemGroupType } from '../rankingSystemGroup.type';
import { DrawCompetitionType } from './draw-competition.type';
import { EventCompetitionType } from './event-competition.type';

const SubEventCompetitionType = new GraphQLObjectType({
  name: 'SubEventCompetition',
  description: 'A SubEventCompetition',
  fields: () =>
    Object.assign(getAttributeFields(SubEventCompetition), {
      draws: {
        type: new GraphQLList(DrawCompetitionType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(SubEventCompetition.associations.draws, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      event: {
        type: EventCompetitionType,
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(SubEventCompetition.associations.event, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      entries: {
        type: new GraphQLList(EntryType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(SubEventCompetition.associations.entries, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      groups: {
        type: new GraphQLList(RankingSystemGroupType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(SubEventCompetition.associations.groups, {
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

const SubEventCompetitionInputType = new GraphQLInputObjectType({
  name: 'SubEventCompetitionInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(SubEventCompetition, {
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

export { SubEventCompetitionType, SubEventCompetitionInputType };
