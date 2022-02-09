import { RankingSystemGroup } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { getAttributeFields } from './attributes.type';
import { SubEventTournamentType } from './tournaments';
import { SubEventCompetitionType } from './competition';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { RankingSystemType } from './rankingSystem.type';

export const RankingSystemGroupType = new GraphQLObjectType({
  name: 'RankingSystemGroup',
  description: 'A RankingSystemGroup',
  fields: () =>
    Object.assign(getAttributeFields(RankingSystemGroup), {
      subEventCompetitions: {
        type: new GraphQLList(SubEventCompetitionType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingSystemGroup.associations.subEventCompetitions, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },

      subEventTournaments: {
        type: new GraphQLList(SubEventTournamentType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingSystemGroup.associations.subEventTournaments, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },

      systems: {
        type: new GraphQLList(RankingSystemType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(RankingSystemGroup.associations.systems, {
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

export const RankingSystemGroupInputType = new GraphQLInputObjectType({
  name: 'RankingSystemGroupInput',
  description: 'This represents a RankingSystemGroupInput',
  fields: () =>
    Object.assign(
      getAttributeFields(RankingSystemGroup, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      }),
      {}
    )
});
