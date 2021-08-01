import { logger } from '@badvlasim/shared';
import { RankingPlace, Team } from '@badvlasim/shared/models';
import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { getAttributeFields } from './attributes.type';
import { PlayerInputType, PlayerType } from './player.type';
import moment from 'moment';
import { SubEventCompetitionType } from './competition';
import { ClubType } from './club.type';
import { LocationType } from './location.type';
import { queryFixer } from '../queryFixer';
import { EncounterCompetitionType } from './competition/encounter-competition.type';

export const TeamType = new GraphQLObjectType({
  name: 'Team',
  description: 'A Team',
  fields: () =>
    Object.assign(getAttributeFields(Team), {
      club: {
        type: ClubType,
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Team.associations.club, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },

      homeEncounters: {
        type: new GraphQLList(EncounterCompetitionType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Team.associations.homeEncounters, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },

      awayEncounters: {
        type: new GraphQLList(EncounterCompetitionType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Team.associations.awayEncounters, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      
      players: {
        type: new GraphQLList(PlayerType),
        args: Object.assign(defaultListArgs(), {
          end: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Team.associations.players, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          },
          after: (result, args, context) => {
            // Only get after certain period
            if (args.end) {
              result
                // not empty
                .filter(p => p != null)
                .filter(p => p.getDataValue('TeamPlayerMembership') != null)
                // then filter
                .filter(player => {
                  return moment(player.getDataValue('TeamPlayerMembership').end).isSameOrAfter(
                    args.end
                  );
                });
            }

            return result.map(player => {
              player.base = player.getDataValue('TeamPlayerMembership')?.base;
              return player;
            });
          }
        })
      },
      subEvents: {
        type: new GraphQLList(SubEventCompetitionType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Team.associations.subEvents, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      captain: {
        type: PlayerType,
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Team.associations.captain, {
          before: async (findOptions, args, context, info) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },
      locations: {
        type: new GraphQLList(LocationType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Team.associations.locations, {
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

export const TeamInputType = new GraphQLInputObjectType({
  name: 'TeamInput',
  description: 'This represents a TeamInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Team, {
        exclude: ['createdAt', 'updatedAt', 'name', 'abbreviation'],
        optionalString: ['id']
      }),
      {
        players: {
          type: PlayerInputType
        }
      }
    )
});
