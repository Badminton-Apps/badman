import { TeamType } from './../team.type';
import { SubEventCompetition } from '@badvlasim/shared/models';
import { GraphQLBoolean, GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { resolver, defaultListArgs } from 'graphql-sequelize';
import { getAttributeFields } from '../attributes.type';
import { RankingSystemGroupInputType } from '../rankingSystemGroup.type';
import { DrawCompetitionType } from './draw-competition.type';
import { EventCompetitionType } from './event-competition.type';
import { queryFixer } from '../../queryFixer';

const SubEventCompetitionType = new GraphQLObjectType({
  name: 'SubEventCompetition',
  description: 'A SubEventCompetition',
  fields: () =>
    Object.assign(getAttributeFields(SubEventCompetition), {
      draws: {
        type: new GraphQLList(DrawCompetitionType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(SubEventCompetition.associations.draws, {
          before: async (findOptions, args, context, info) => {
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
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      teams: {
        type: new GraphQLList(SubEventCompetitionType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(SubEventCompetition.associations.teams, {
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
