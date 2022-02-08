import { EventEntry, Player } from '@badvlasim/shared';
import {
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';
import { resolver } from 'graphql-sequelize';
import { PlayerType } from './player.type';
import { getAttributeFields } from './attributes.type';
import { TeamType } from './team.type';
import { DrawTournamentType, SubEventTournamentType } from './tournaments';
import { DrawCompetitionType, SubEventCompetitionType } from './competition';
import { StandingType } from './standing.type';

export const EntryType = new GraphQLObjectType({
  name: 'Entry',
  description: 'A Entry',
  fields: () =>
    Object.assign(getAttributeFields(EventEntry, { exclude: ['_meta'] }), {
      meta: {
        type: entryMeta,
        resolve: (entry: EventEntry) => {
          return entry.meta;
        }
      },
      team: {
        type: TeamType,
        resolve: resolver(EventEntry.associations.team)
      },
      tournamentSubEvent: {
        type: SubEventTournamentType,
        resolve: resolver(EventEntry.associations.tournamentSubEvent)
      },
      tournamentDraw: {
        type: DrawTournamentType,
        resolve: resolver(EventEntry.associations.tournamentDraw)
      },
      competitionSubEvent: {
        type: SubEventCompetitionType,
        resolve: resolver(EventEntry.associations.competitionSubEvent)
      },
      competitionDraw: {
        type: DrawCompetitionType,
        resolve: resolver(EventEntry.associations.competitionDraw)
      },
      players: {
        type: new GraphQLList(PlayerType),
        resolve: async (entry: EventEntry) => entry.players()
      },
      standing: {
        type: StandingType,
        resolve: resolver(EventEntry.associations.standing)
      }
    })
});

export const EntryInputType = new GraphQLInputObjectType({
  name: 'EntryInput',
  description: 'This represents a EntryInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(EventEntry, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      })
    )
});

const entryMeta = new GraphQLObjectType({
  name: 'entryMeta',
  description: 'Entry meta',
  fields: () => ({
    competition: { type: competitionMeta },
    tournament: { type: tournamentMeta }
  })
});

const competitionMeta = new GraphQLObjectType({
  name: 'competitionMeta',
  description: 'Competition meta',
  fields: () => ({
    teamIndex: {
      type: GraphQLString
    },
    players: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: 'TeamMetaPlayers',
          description: 'Team meta Players',
          fields: () => ({
            player: {
              type: PlayerType,
              resolve: async (...args) => {
                return Player.findByPk(args?.at(0).id);
              }
            },
            id: {
              type: GraphQLString
            },
            gender: {
              type: GraphQLString
            },
            single: {
              type: GraphQLInt
            },
            double: {
              type: GraphQLInt
            },
            mix: {
              type: GraphQLInt
            }
          })
        })
      )
    }
  })
});

const tournamentMeta = new GraphQLObjectType({
  name: 'tournamentMeta',
  description: 'Tournament meta',
  fields: () => ({
    TODO: {
      type: GraphQLString
    }
  })
});
