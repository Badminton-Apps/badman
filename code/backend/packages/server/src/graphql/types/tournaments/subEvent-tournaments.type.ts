import { SubEventTournament } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType } from 'graphql';
import { resolver, defaultListArgs } from 'graphql-sequelize';
import { queryFixer } from '../../queryFixer';
import { getAttributeFields } from '../attributes.type';
import { EntryType } from '../entry.type';
import { RankingSystemGroupInputType, RankingSystemGroupType } from '../rankingSystemGroup.type';
import { DrawTournamentType } from './draw-tournaments.type';
import { EventTournamentType } from './event-tournaments.type';

export const SubEventTournamentType = new GraphQLObjectType({
  name: 'SubEventTournament',
  description: 'A SubEventTournament',
  fields: () =>
    Object.assign(getAttributeFields(SubEventTournament), {
      draws: {
        type: new GraphQLList(DrawTournamentType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(SubEventTournament.associations.draws, {
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
        resolve: resolver(SubEventTournament.associations.entries, {
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
        type: EventTournamentType,
        resolve: resolver(SubEventTournament.associations.event)
      },
      groups: {
        type: new GraphQLList(RankingSystemGroupType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(SubEventTournament.associations.groups, {
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

export const SubEventTournamentInputType = new GraphQLInputObjectType({
  name: 'SubEventTournamentInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(SubEventTournament, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }),
      {
        groups: {
          type: new GraphQLList(RankingSystemGroupInputType)
        }
      }
    )
});
