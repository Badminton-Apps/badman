import { AuthenticatedRequest, canExecute, Player, SubEventCompetition, Team, TeamPlayerMembership } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import moment from 'moment';
import { EntryType } from './entry.type';
import { queryFixer } from '../queryFixer';
import { getAttributeFields } from './attributes.type';
import { ClubType } from './club.type';
import { EncounterCompetitionType } from './competition/encounter-competition.type';
import { LocationType } from './location.type';
import { PlayerInputType, PlayerType, TeamPlayerType } from './player.type';

export const TeamType = new GraphQLObjectType({
  name: 'Team',
  description: 'A Team',
  fields: () =>
    Object.assign(getAttributeFields(Team), {
      email: {
        type: GraphQLString,
        resolve: async (obj: Team, _, context: { req: AuthenticatedRequest; res: Response }) => {
          const perm = [`details-any:team`, `${obj.clubId}_details:team`];

          canExecute(
            context?.req?.user,
            { anyPermissions: perm },
            "You don't have permissions to access the email field"
          );
          return obj.email;
        }
      },
      phone: {
        type: GraphQLString,
        resolve: async (obj: Team, _, context: { req: AuthenticatedRequest; res: Response }) => {
          const perm = [`details-any:team`, `${obj.clubId}_details:team`];

          canExecute(
            context?.req?.user,
            { anyPermissions: perm },
            "You don't have permissions to access the phone field"
          );
          return obj.phone;
        }
      },
      club: {
        type: ClubType,
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(Team.associations.club, {
          before: async (findOptions: { [key: string]: object }) => {
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
          before: async (findOptions: { [key: string]: object }) => {
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
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          }
        })
      },

      players: {
        type: new GraphQLList(TeamPlayerType),
        args: Object.assign(defaultListArgs(), {
          end: {
            type: GraphQLString
          }
        }),
        resolve: resolver(Team.associations.players, {
          before: async (findOptions: { where: { [key: string]: object } }) => {
            const whereFixed = queryFixer(findOptions.where);
            let where = whereFixed;

            if (findOptions.where?.base) {
              delete whereFixed.base;
              where = whereFixed;
            }

            findOptions = {
              ...findOptions,
              where
            };
            return findOptions;
          },
          after: (result: (Player & TeamPlayerMembership)[], args) => {
            // Only get after certain period
            if (args.end) {
              result
                // not empty
                .filter((p) => p != null)
                .filter((p) => p.getDataValue('TeamPlayerMembership') != null)
                // then filter
                .filter((player) => {
                  return moment(player.getDataValue('TeamPlayerMembership').end).isSameOrAfter(
                    args.end
                  );
                });
            }

            let players = result.map((player) => {
              player.base = player.getDataValue('TeamPlayerMembership')?.base;
              return player;
            });

            if (args.where?.base) {
              players = players.filter((player) => player.base === args.where.base);
            }
            return players;
          }
        })
      },
      entries: {
        type: new GraphQLList(EntryType),
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Team.associations.entries, {
          before: async (findOptions: { [key: string]: object }) => {
            findOptions = {
              ...findOptions,
              where: queryFixer(findOptions.where)
            };
            return findOptions;
          },
          after: (subEvents: (SubEventCompetition)[]) => {
            return subEvents.map((subevent) => {
              // TODO
              // subevent.meta = subevent.getEntries().meta;
              return subevent;
            });
          }
        })
      },
      captain: {
        type: PlayerType,
        args: Object.assign(defaultListArgs()),
        resolve: resolver(Team.associations.captain, {
          before: async (findOptions: { [key: string]: object }) => {
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
